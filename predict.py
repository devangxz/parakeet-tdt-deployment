"""
Replicate prediction script for NVIDIA Parakeet TDT 0.6B V2 with Speaker Diarization
Based on Modal implementation with NeMo 2.3.0 and pyannote.audio 3.1.1
Generates final output in: text + words[] + speaker = A, B, C format
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
import torch
import requests
from urllib.parse import urlparse
from pydub import AudioSegment
import nemo.collections.asr as nemo_asr
from cog import BasePredictor, Input, Path as CogPath

class Predictor(BasePredictor):
    def setup(self) -> None:
        print(f"[{datetime.now().isoformat()}] [INFO] [Parakeet] Loading model...")
        self.model = nemo_asr.models.ASRModel.from_pretrained(
            model_name="nvidia/parakeet-tdt-0.6b-v2"
        )
        if torch.cuda.is_available():
            self.model = self.model.cuda()
        print(f"[{datetime.now().isoformat()}] [INFO] [Parakeet] Model loaded!")

    def predict(
        self,
        audio: CogPath = Input(description="Audio file (WAV, MP3, FLAC, M4A, etc.)", default=None),
        audio_url: str = Input(description="URL of audio file", default=None),
        return_timestamps: bool = Input(description="Return word-level timestamps", default=True)
    ) -> Dict[str, Any]:
        try:
            if audio_url:
                print(f"[{datetime.now().isoformat()}] [INFO] Downloading from URL: {audio_url}")
                audio_bytes, filename = self._download_from_url(audio_url)
            elif audio:
                print(f"[{datetime.now().isoformat()}] [INFO] Using uploaded file: {audio}")
                with open(audio, 'rb') as f:
                    audio_bytes = f.read()
                filename = os.path.basename(str(audio))
            else:
                raise ValueError("Either 'audio' or 'audio_url' must be provided")

            result = self._process_audio(audio_bytes, filename, return_timestamps)
            return result

        except Exception as e:
            error_msg = f"Prediction failed: {str(e)}"
            print(f"[{datetime.now().isoformat()}] [ERROR] {error_msg}")
            return { "status": "error", "error": error_msg }

    def _download_from_url(self, url: str):
        parsed_url = urlparse(url)
        filename = Path(parsed_url.path).name or "audio_from_url.wav"
        response = requests.get(url, timeout=60, stream=True)
        response.raise_for_status()
        audio_bytes = response.content
        size_mb = len(audio_bytes) / (1024 * 1024)
        print(f"[{datetime.now().isoformat()}] [INFO] Download complete: {size_mb:.1f} MB")
        if size_mb > 100:
            raise ValueError("File too large (>100MB)")
        if size_mb == 0:
            raise ValueError("Downloaded file is empty")
        return audio_bytes, filename

    def _process_audio(self, audio_bytes: bytes, filename: str, return_timestamps: bool):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / filename
            with open(input_path, 'wb') as f:
                f.write(audio_bytes)

            audio = AudioSegment.from_file(str(input_path))
            model_audio = audio.set_frame_rate(16000).set_channels(1)
            model_path = temp_path / "audio_model.wav"
            model_audio.export(str(model_path), format="wav")

            print(f"[{datetime.now().isoformat()}] [INFO] Transcribing...")
            transcripts = self.model.transcribe(
                audio=[str(model_path)],
                batch_size=1,
                return_hypotheses=True,
                timestamps=return_timestamps
            )

            if not transcripts:
                raise Exception("No transcription result returned")

            hypothesis = transcripts[0]
            text = getattr(hypothesis, 'text', str(hypothesis))
            word_timestamps = []
            if return_timestamps and hasattr(hypothesis, 'timestamp') and 'word' in hypothesis.timestamp:
                for word_info in hypothesis.timestamp['word']:
                    word_timestamps.append({
                        "text": word_info['word'],
                        "start": int(word_info['start'] * 1000),
                        "end": int(word_info['end'] * 1000),
                        "confidence": 0.95,
                        "speaker": "A"  # placeholder, will be replaced
                    })

            print(f"[{datetime.now().isoformat()}] [INFO] Running diarization...")
            speakers = self._diarize_audio(model_path)

            # Assign speakers to words
            for word in word_timestamps:
                for spk in speakers:
                    if spk["start"] <= word["start"] / 1000.0 < spk["end"]:
                        word["speaker"] = spk["label"]
                        break

            print(f"[{datetime.now().isoformat()}] [INFO] Done! Words: {len(word_timestamps)}")

            return {
                "id": datetime.now().strftime("%Y%m%d%H%M%S"),
                "status": "completed",
                "text": text,
                "words": word_timestamps
            }

    def _diarize_audio(self, audio_path: Path):
        from pyannote.audio import Pipeline
        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=os.environ.get("HUGGINGFACE_TOKEN")
        )
        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))

        diarization = pipeline(str(audio_path))
        segments = []
        label_map = {}
        label_counter = 0

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            if speaker not in label_map:
                label_map[speaker] = chr(ord('A') + label_counter)
                label_counter += 1
            segments.append({
                "label": label_map[speaker],
                "start": float(turn.start),
                "end": float(turn.end)
            })

        print(f"[{datetime.now().isoformat()}] [INFO] Found {len(label_map)} speakers.")
        return segments 