import os
import torch
from typing import Dict, Any
import nemo.collections.asr as nemo_asr
from cog import BasePredictor, Input, Path


class Predictor(BasePredictor):
    def setup(self) -> None:
        """Load the NVIDIA Parakeet TDT 0.6B V2 model on startup."""
        print("🦜 Loading NVIDIA Parakeet TDT 0.6B V2...")
        
        # Load the model from Hugging Face
        self.asr_model = nemo_asr.models.ASRModel.from_pretrained(
            model_name="nvidia/parakeet-tdt-0.6b-v2"
        )
        
        # Enable evaluation mode for inference
        self.asr_model.eval()
        
        print("✅ Model loaded successfully!")

    def predict(
        self,
        audio: Path = Input(
            description="Audio file (.wav, .flac, .mp3). Best with 16kHz mono .wav"
        ),
        timestamps: bool = Input(
            description="Include word-level timestamps",
            default=False
        )
    ) -> Dict[str, Any]:
        """Transcribe audio using NVIDIA Parakeet TDT 0.6B V2"""
        
        print(f"🎙️ Processing: {audio}")
        
        try:
            audio_path = str(audio)
            
            if timestamps:
                outputs = self.asr_model.transcribe(
                    paths2audio_files=[audio_path],
                    timestamps=True
                )
                
                result = {
                    "transcription": outputs[0].text,
                    "timestamps": outputs[0].timestamp if hasattr(outputs[0], 'timestamp') else {}
                }
            else:
                outputs = self.asr_model.transcribe(
                    paths2audio_files=[audio_path]
                )
                
                result = {
                    "transcription": outputs[0].text
                }
            
            result["model"] = "nvidia/parakeet-tdt-0.6b-v2"
            return result
            
        except Exception as e:
            return {
                "transcription": "",
                "error": str(e),
                "model": "nvidia/parakeet-tdt-0.6b-v2"
            } 