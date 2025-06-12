# 🚀 Deploy NVIDIA Parakeet TDT 0.6B V2 on Replicate

## Prerequisites

1. **Replicate Account**: Sign up at https://replicate.com
2. **Cog Installed**: Install Replicate's deployment tool
3. **Docker**: Ensure Docker is running

## Step 1: Install Cog

### For Windows (PowerShell):
```powershell
# Download and install Cog
curl -o cog.exe -L "https://github.com/replicate/cog/releases/latest/download/cog_Windows_x86_64.exe"
Move-Item cog.exe C:\Windows\System32\cog.exe
```

### For macOS:
```bash
brew install replicate/tap/cog
```

### For Linux:
```bash
curl -o /usr/local/bin/cog -L https://github.com/replicate/cog/releases/latest/download/cog_`uname -s`_`uname -m`
chmod +x /usr/local/bin/cog
```

## Step 2: Test Locally (Optional)

```bash
# Build the image locally
cog build

# Test with sample audio
cog predict -i audio=@sample.wav

# Test with timestamps
cog predict -i audio=@sample.wav -i timestamps=true
```

## Step 3: Deploy to Replicate

```bash
# Login to Replicate
cog login

# Push to Replicate (replace 'yourusername' with your actual username)
cog push r8.im/yourusername/parakeet-tdt-0.6b-v2
```

## Step 4: Use Your Deployed Model

### Via Replicate Web UI:
Visit: `https://replicate.com/yourusername/parakeet-tdt-0.6b-v2`

### Via API:
```python
import replicate

output = replicate.run(
    "yourusername/parakeet-tdt-0.6b-v2",
    input={
        "audio": open("audio.wav", "rb"),
        "timestamps": False
    }
)
print(output["transcription"])
```

### Via cURL:
```bash
curl -s -X POST \
  -H "Authorization: Token YOUR_REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "YOUR_MODEL_VERSION",
    "input": {
      "audio": "https://example.com/audio.wav",
      "timestamps": false
    }
  }' \
  https://api.replicate.com/v1/predictions
```

## Step 5: Update Your App

Update `app_replicate.py` to use your deployed model:

```python
# Replace this line:
output = replicate.run("nvidia/parakeet-tdt-0.6b-v2", ...)

# With your deployed model:
output = replicate.run("yourusername/parakeet-tdt-0.6b-v2", ...)
```

## Expected Build Time

- **First build**: 15-30 minutes (downloads NeMo, PyTorch, model weights)
- **Subsequent builds**: 2-5 minutes (cached layers)

## Cost Estimates

- **Build cost**: Free
- **Inference cost**: ~$0.001-0.01 per transcription (depends on audio length)
- **Cold start**: ~30-60 seconds (model loading)
- **Warm inference**: ~1-5 seconds

## Features of Your Deployed Model

✅ **NVIDIA Parakeet TDT 0.6B V2** (latest, January 2025)  
✅ **Punctuation & capitalization** included  
✅ **Word-level timestamps** (optional)  
✅ **Up to 24 minutes** audio support  
✅ **Multiple formats**: .wav, .flac, .mp3  
✅ **GPU-optimized** inference  

## Troubleshooting

### Build fails with CUDA errors:
```yaml
# In cog.yaml, try different CUDA version:
cuda: "11.7"  # or "12.0"
```

### Out of memory during model loading:
```yaml
# Use smaller batch size in predict.py:
batch_size=1  # Reduce if needed
```

### Model download timeout:
The first build downloads ~2-3GB of model weights. Ensure stable internet.

## File Structure

```
new_parakeet/
├── cog.yaml           # Cog configuration
├── predict.py         # Main prediction script  
├── app_replicate.py   # Your local app (updated)
└── DEPLOY_REPLICATE.md # This guide
```

## Success Indicators

✅ `cog build` completes without errors  
✅ `cog predict` returns transcription  
✅ `cog push` uploads successfully  
✅ Web UI shows your model running  

**Your model will be available at:**  
`https://replicate.com/yourusername/parakeet-tdt-0.6b-v2` 