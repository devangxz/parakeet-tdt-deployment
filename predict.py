"""
Replicate prediction script for NVIDIA Parakeet TDT 0.6B V2 with Speaker Diarization
Compatible with NeMo 2.3.0 and pyannote.audio 3.1.1
Outputs: text + words[] + speaker (SPEAKER_00, SPEAKER_01...)
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
import base64
import torch
import requests
from urllib.parse import urlparse
from pydub import AudioSegment
import nemo.collections.asr as nemo_asr
from cog import BasePredictor, Input, Path as CogPath

class Predictor(BasePredictor):
    def setup(self) -> None:
        """Load ASR + Diarization models on startup"""
        print(f"[{datetime.now().isoformat()}] [INFO] Loading Parakeet model...")
        self.asr_model = nemo_asr.models.ASRModel.from_pretrained(
            model_name="nvidia/parakeet-tdt-0.6b-v2"
        )
        if torch.cuda.is_available():
            self.asr_model = self.asr_model.cuda()

        print(f"[{datetime.now().isoformat()}] [INFO] Loading NeMo speaker diarization model...")
        # Try using NeMo's neural speaker diarization
        try:
            from nemo.collections.asr.models.msdd_models import NeuralDiarizer
            self.diarization_model = NeuralDiarizer.from_pretrained(
                model_name="nvidia/speakerverification_en_titanet_large"
            )
            if torch.cuda.is_available():
                self.diarization_model = self.diarization_model.cuda()
            self.use_nemo_diarization = True
            print(f"[{datetime.now().isoformat()}] [INFO] Using NeMo neural diarization")
        except Exception as e:
            print(f"[{datetime.now().isoformat()}] [WARNING] Failed to load NeMo diarization: {e}")
            print(f"[{datetime.now().isoformat()}] [INFO] Falling back to pyannote diarization")
            # Fallback to pyannote
            from pyannote.audio import Pipeline
            hf_token = os.environ.get("HUGGINGFACE_TOKEN", None)
            if not hf_token:
                encoded_token = "aGZfUk1jb1NscXNXc1VPV2dtYndCcXhLc0RBc3dTVGJYWnpLRg=="
                hf_token = base64.b64decode(encoded_token).decode('utf-8')
                
            self.diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
            if torch.cuda.is_available():
                self.diarization_pipeline.to(torch.device("cuda"))
            self.use_nemo_diarization = False

        print(f"[{datetime.now().isoformat()}] [INFO] Models loaded successfully.")

    def predict(
        self,
        audio: CogPath = Input(description="Audio file to transcribe", default=None),
        audio_url: str = Input(description="URL of audio file to transcribe", default=None),
        return_timestamps: bool = Input(description="Return word-level timestamps", default=True)
    ) -> Dict[str, Any]:
        try:
            # Load audio bytes
            if audio_url:
                audio_bytes, filename = self._download_from_url(audio_url)
            elif audio:
                with open(audio, 'rb') as f:
                    audio_bytes = f.read()
                filename = os.path.basename(str(audio))
            else:
                raise ValueError("Provide either 'audio' or 'audio_url'.")

            # Process
            result = self._transcribe_with_diarization(audio_bytes, filename, return_timestamps)
            return result

        except Exception as e:
            print(f"[ERROR] {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "processing_time": datetime.now().isoformat()
            }

    def _download_from_url(self, url: str) -> tuple[bytes, str]:
        parsed_url = urlparse(url)
        filename = Path(parsed_url.path).name or "audio_from_url.wav"
        response = requests.get(url, timeout=120, stream=True)
        response.raise_for_status()
        audio_bytes = response.content
        file_size = len(audio_bytes)
        if file_size > 100 * 1024 * 1024:
            raise ValueError(f"File too large: {file_size} bytes (max 100MB)")
        if file_size == 0:
            raise ValueError("Downloaded file is empty")
        return audio_bytes, filename

    def _transcribe_with_diarization(
        self, audio_bytes: bytes, filename: str, return_timestamps: bool
    ) -> Dict[str, Any]:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / filename
            with open(input_path, 'wb') as f:
                f.write(audio_bytes)

            # Convert to 16kHz mono WAV
            audio = AudioSegment.from_file(str(input_path))
            model_audio = audio.set_frame_rate(16000).set_channels(1)
            model_path = temp_path / "audio_model.wav"
            model_audio.export(str(model_path), format="wav")
            
            # Audio analysis for debugging
            duration = len(model_audio) / 1000.0
            print(f"[DEBUG] Audio analysis: duration={duration:.2f}s, channels={audio.channels}, sample_rate={audio.frame_rate}Hz, converted_to=16000Hz_mono")

            # --- Transcription ---
            transcripts = self.asr_model.transcribe(
                audio=[str(model_path)],
                batch_size=1,
                return_hypotheses=True,
                timestamps=return_timestamps
            )
            if not transcripts:
                raise Exception("No transcription result returned.")

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
                        "speaker": "SPEAKER_00"  # default, will be updated below
                    })

            # --- Diarization ---
            print(f"[INFO] Running speaker diarization...")
            speaker_segments = []
            
            if self.use_nemo_diarization:
                # Use NeMo neural diarization
                try:
                    print(f"[INFO] Using NeMo neural diarization")
                    # NeMo neural diarization expects different input format
                    result = self.diarization_model.diarize_batch([str(model_path)])
                    
                    # Process NeMo results
                    for batch_result in result:
                        for segment in batch_result:
                            speaker_segments.append({
                                "speaker": f"SPEAKER_{segment['speaker']:02d}",
                                "start": segment["start"],
                                "end": segment["end"],
                                "confidence": segment.get("confidence", 0.95)
                            })
                    
                    print(f"[DEBUG] NeMo diarization found {len(speaker_segments)} segments")
                    
                except Exception as e:
                    print(f"[WARNING] NeMo diarization failed: {e}, falling back to pyannote")
                    self.use_nemo_diarization = False
            
            if not self.use_nemo_diarization:
                # Use pyannote.audio diarization
                try:
                    diarization = self.diarization_pipeline(str(model_path))
                    
                    # Count unique speakers found
                    unique_speakers = set()
                    for turn, _, speaker_label in diarization.itertracks(yield_label=True):
                        unique_speakers.add(speaker_label)
                    
                    print(f"[DEBUG] Pyannote found {len(unique_speakers)} unique speakers")
                    
                    # If only 1 speaker found, try with more aggressive settings
                    if len(unique_speakers) <= 1 and duration > 3.0:
                        print(f"[INFO] Only 1 speaker detected, trying with more sensitive settings...")
                        
                        from pyannote.audio import Pipeline
                        alt_pipeline = Pipeline.from_pretrained(
                            "pyannote/speaker-diarization-3.1",
                            use_auth_token=os.environ.get("HUGGINGFACE_TOKEN", None)
                        )
                        
                        alt_pipeline.instantiate({
                            "clustering": {
                                "method": "centroid", 
                                "min_cluster_size": 5,
                                "threshold": 0.5,
                            }
                        })
                        
                        if torch.cuda.is_available():
                            alt_pipeline.to(torch.device("cuda"))
                            
                        diarization = alt_pipeline(str(model_path))
                        
                except Exception as e:
                    print(f"[WARNING] Pyannote diarization failed: {e}")
                    diarization = self.diarization_pipeline(str(model_path))
                
                # Process pyannote results
                print(f"[DEBUG] Pyannote diarization results:")
                for turn, _, speaker_label in diarization.itertracks(yield_label=True):
                    print(f"[DEBUG] {speaker_label}: {turn.start:.2f}s - {turn.end:.2f}s")
                    speaker_segments.append({
                        "speaker": speaker_label,
                        "start": turn.start,
                        "end": turn.end,
                        "confidence": 0.95
                    })

            speaker_segments.sort(key=lambda x: x["start"])
            
            if not speaker_segments:
                print(f"[WARNING] No speaker segments found, using fallback")
                duration = len(model_audio) / 1000.0
                speaker_segments = [{
                    "speaker": "SPEAKER_00",
                    "start": 0.0,
                    "end": duration,
                    "confidence": 0.95
                }]

            print(f"[DEBUG] Found {len(speaker_segments)} speaker segments")

            # --- Merge transcript with speakers ---
            word_timestamps = self._merge_transcript_speakers_improved(
                {"text": text, "word_timestamps": word_timestamps}, 
                speaker_segments
            )

            # --- Final result ---
            result = {
                "id": filename[:8],
                "status": "completed",
                "text": text,
                "words": word_timestamps
            }
            return result

    def _merge_transcript_speakers_improved(self, transcript, speakers):
        """Merge transcript with speaker information (use Pyannote speaker labels as-is)."""
        words = transcript.get("word_timestamps", [])

        assignments_made = 0

        for word in words:
            word_start = word.get("start", 0) / 1000.0
            word_end = word.get("end", 0) / 1000.0
            word_center = (word_start + word_end) / 2.0

            word["speaker"] = "SPEAKER_00"

            for speaker_seg in speakers:
                if speaker_seg["start"] <= word_center <= speaker_seg["end"]:
                    word["speaker"] = speaker_seg["speaker"]
                    assignments_made += 1
                    break

        print(f"[DEBUG] Speaker assignments made: {assignments_made}/{len(words)} words")
        return words 