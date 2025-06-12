# 🦜 NVIDIA Parakeet TDT 0.6B V2 - Replicate Deployment

Deploy NVIDIA's Parakeet TDT 0.6B V2 speech-to-text model on Replicate with GitHub Actions.

## 🚀 Quick Deploy

### 1. Set Up Repository Secret
1. Go to [Replicate API Tokens](https://replicate.com/account/api-tokens)
2. Create a new API token
3. Add it to GitHub Secrets:
   - Go to: `Settings > Secrets and variables > Actions`
   - Name: `REPLICATE_CLI_AUTH_TOKEN`
   - Value: Your API token

### 2. Deploy
- **Automatic**: Push to `main` branch
- **Manual**: Go to Actions tab → "Deploy to Replicate" → Run workflow

## 🛠️ Local Testing

```bash
# Install Cog
curl -o /usr/local/bin/cog -L "https://github.com/replicate/cog/releases/latest/download/cog_$(uname -s)_$(uname -m)"
chmod +x /usr/local/bin/cog

# Test locally
cog predict -i audio=@audio.wav

# Push to Replicate
cog login
cog push r8.im/your-username/parakeet-tdt-0.6b-v2
```

## 📁 Files

- `predict.py` - Main prediction script
- `cog.yaml` - Replicate configuration
- `.github/workflows/deploy.yml` - GitHub Actions workflow

## ⚡ Features

- 🎙️ High-quality speech transcription
- 🕐 Optional word-level timestamps
- 🚀 Automated deployment via GitHub Actions
- 🐳 Docker containerized 