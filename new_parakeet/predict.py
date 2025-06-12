import os
import torch
import logging
from typing import Dict, Any, Optional
import nemo.collections.asr as nemo_asr
from cog import BasePredictor, Input, Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Predictor(BasePredictor):
    def setup(self) -> None:
        """Load the NVIDIA Parakeet TDT 0.6B V2 model on startup."""
        logger.info("🦜 Loading NVIDIA Parakeet TDT 0.6B V2...")
        
        try:
            # Load the model from Hugging Face
            self.asr_model = nemo_asr.models.ASRModel.from_pretrained(
                model_name="nvidia/parakeet-tdt-0.6b-v2"
            )
            
            # Enable evaluation mode for inference
            self.asr_model.eval()
            
            # Set device
            if torch.cuda.is_available():
                self.device = torch.device("cuda")
                logger.info(f"🚀 Using GPU: {torch.cuda.get_device_name()}")
            else:
                self.device = torch.device("cpu")
                logger.info("💻 Using CPU")
            
            # Move model to device
            if hasattr(self.asr_model, 'to'):
                self.asr_model = self.asr_model.to(self.device)
            
            logger.info("✅ Model loaded successfully!")
            
        except Exception as e:
            logger.error(f"❌ Failed to load model: {str(e)}")
            raise RuntimeError(f"Model initialization failed: {str(e)}")

    def predict(
        self,
        audio: Path = Input(
            description="Audio file (.wav, .flac, .mp3). Best with 16kHz mono .wav"
        ),
        timestamps: bool = Input(
            description="Include word-level timestamps",
            default=False
        ),
        batch_size: int = Input(
            description="Batch size for processing (default: 1)",
            default=1,
            ge=1,
            le=4
        )
    ) -> Dict[str, Any]:
        """Transcribe audio using NVIDIA Parakeet TDT 0.6B V2"""
        
        logger.info(f"🎙️ Processing: {audio}")
        
        try:
            audio_path = str(audio)
            
            # Validate file exists and is readable
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
            if not os.access(audio_path, os.R_OK):
                raise PermissionError(f"Cannot read audio file: {audio_path}")
            
            # Check file size (limit to ~100MB)
            file_size = os.path.getsize(audio_path)
            if file_size > 100 * 1024 * 1024:
                raise ValueError(f"Audio file too large: {file_size / (1024*1024):.1f}MB. Maximum 100MB.")
            
            logger.info(f"📊 File size: {file_size / (1024*1024):.2f}MB")
            
            # Transcribe with error handling
            if timestamps:
                logger.info("🕐 Generating transcription with timestamps...")
                outputs = self.asr_model.transcribe(
                    paths2audio_files=[audio_path],
                    timestamps=True,
                    batch_size=batch_size
                )
                
                if outputs and len(outputs) > 0:
                    result = {
                        "transcription": outputs[0].text if outputs[0].text else "",
                        "timestamps": {
                            "word": getattr(outputs[0], 'timestamp', {}).get('word', []),
                            "segment": getattr(outputs[0], 'timestamp', {}).get('segment', [])
                        }
                    }
                else:
                    result = {
                        "transcription": "",
                        "timestamps": {"word": [], "segment": []},
                        "warning": "No transcription output received"
                    }
            else:
                logger.info("📝 Generating basic transcription...")
                outputs = self.asr_model.transcribe(
                    paths2audio_files=[audio_path],
                    batch_size=batch_size
                )
                
                if outputs and len(outputs) > 0:
                    result = {
                        "transcription": outputs[0].text if outputs[0].text else ""
                    }
                else:
                    result = {
                        "transcription": "",
                        "warning": "No transcription output received"
                    }
            
            # Add metadata
            result.update({
                "model": "nvidia/parakeet-tdt-0.6b-v2",
                "model_version": "2.0",
                "file_size_mb": round(file_size / (1024*1024), 2),
                "processing_device": str(self.device),
                "batch_size": batch_size
            })
            
            logger.info(f"✅ Transcription completed: {len(result.get('transcription', ''))} characters")
            return result
            
        except FileNotFoundError as e:
            logger.error(f"📁 File error: {str(e)}")
            return {
                "transcription": "",
                "error": f"File not found: {str(e)}",
                "error_type": "FileNotFoundError",
                "model": "nvidia/parakeet-tdt-0.6b-v2"
            }
            
        except PermissionError as e:
            logger.error(f"🔒 Permission error: {str(e)}")
            return {
                "transcription": "",
                "error": f"Permission denied: {str(e)}",
                "error_type": "PermissionError",
                "model": "nvidia/parakeet-tdt-0.6b-v2"
            }
            
        except ValueError as e:
            logger.error(f"📊 Value error: {str(e)}")
            return {
                "transcription": "",
                "error": str(e),
                "error_type": "ValueError",
                "model": "nvidia/parakeet-tdt-0.6b-v2"
            }
            
        except torch.cuda.OutOfMemoryError as e:
            logger.error(f"🚨 CUDA OOM: {str(e)}")
            return {
                "transcription": "",
                "error": "GPU out of memory. Try reducing batch size or using smaller audio file.",
                "error_type": "OutOfMemoryError",
                "model": "nvidia/parakeet-tdt-0.6b-v2",
                "suggestion": "Reduce batch_size to 1 or split audio into smaller chunks"
            }
            
        except Exception as e:
            logger.error(f"❌ Unexpected error: {str(e)}")
            return {
                "transcription": "",
                "error": f"Unexpected error during transcription: {str(e)}",
                "error_type": type(e).__name__,
                "model": "nvidia/parakeet-tdt-0.6b-v2"
            } 