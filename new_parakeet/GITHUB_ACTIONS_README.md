# 🚀 GitHub Actions CI/CD Pipeline

This repository includes automated workflows for continuous integration, testing, and deployment to Replicate.

## 🔧 Workflows Overview

### 1. CI/CD Pipeline (`.github/workflows/ci.yml`)
**Triggered on:** Push to `main`/`develop`, Pull Requests to `main`

**Features:**
- ✅ Code quality checks (flake8, black, isort)
- 🔍 Type checking with mypy
- 🛡️ Security scanning with bandit
- 📋 Configuration validation (cog.yaml, predict.py)
- 🐳 Docker compatibility testing

### 2. Deploy to Replicate (`.github/workflows/push.yml`)
**Triggered on:** Manual dispatch, Push to `main`

**Features:**
- 🔍 Pre-deployment validation
- 🧪 Local build and testing
- 🚀 Automated deployment to Replicate
- 🔄 Retry logic for failed deployments
- ✅ Post-deployment validation

## 🎯 Setup Instructions

### 1. Repository Secrets
Configure these secrets in your GitHub repository settings:

```
REPLICATE_CLI_AUTH_TOKEN: Your Replicate API credential
```

**To get your Replicate credential:**
1. Visit https://replicate.com/account/api-tokens
2. Create a new credential
3. Add it to GitHub Secrets at: `Settings > Secrets and variables > Actions`

### 2. Branch Protection (Recommended)
Set up branch protection rules for `main`:
- Require status checks: `CI/CD Pipeline`
- Require branches to be up to date
- Require review from code owners

## 🎮 Usage

### Manual Deployment
1. Go to **Actions** tab in your repository
2. Select **"Deploy to Replicate"** workflow
3. Click **"Run workflow"**
4. Options:
   - **Model name:** Override default model name
   - **Force rebuild:** Check to rebuild from scratch (slower)

### Automatic Deployment
- Pushes to `main` branch automatically trigger deployment
- Pull requests trigger CI tests only (no deployment)

## 📊 Workflow Status

### ✅ Success Indicators
- All tests pass
- Code quality checks pass
- Docker build successful
- Model deployed to Replicate
- Post-deployment validation complete

### ❌ Common Failure Reasons

#### CI/CD Pipeline Failures:
- **Code formatting:** Run `black .` and `isort .` locally
- **Linting errors:** Fix flake8 warnings
- **Docker build fails:** Check Dockerfile syntax and dependencies
- **Config validation:** Verify cog.yaml syntax

#### Deployment Failures:
- **Authentication:** Check REPLICATE_CLI_AUTH_TOKEN secret
- **Model name conflicts:** Try a different model name
- **Resource limits:** Large models may timeout (retry often works)
- **Network issues:** Deployment includes automatic retry logic

## 🔧 Local Development

### Pre-commit Setup
```bash
# Install pre-commit hooks
pip install pre-commit black isort flake8
pre-commit install

# Run manually
pre-commit run --all-files
```

### Local Testing
```bash
# Install Cog
curl -o /usr/local/bin/cog -L "https://github.com/replicate/cog/releases/latest/download/cog_$(uname -s)_$(uname -m)"
chmod +x /usr/local/bin/cog

# Test locally
cog build
cog predict -i audio=@test.wav

# Push to Replicate
cog login
cog push r8.im/username/model-name
```

## 🛠️ Customization

### Modify CI Checks
Edit `.github/workflows/ci.yml`:
- Add/remove linting tools
- Change Python version
- Modify security scan settings
- Add custom validation steps

### Modify Deployment
Edit `.github/workflows/push.yml`:
- Change deployment triggers
- Modify retry logic
- Add custom validation steps
- Change model naming convention

### Docker Optimization
Edit `.dockerignore`:
- Add patterns for files to exclude
- Optimize build context size
- Speed up Docker builds

## 📈 Performance Tips

### Faster Builds
- Keep `.dockerignore` updated
- Use Docker layer caching
- Minimize dependencies in cog.yaml
- Use specific package versions

### Reliable Deployments
- Test locally before pushing
- Use force rebuild for major changes
- Monitor GitHub Actions logs
- Check Replicate build logs for issues

## 🆘 Troubleshooting

### Build Timeouts
- Builds timeout after 6 hours
- Large models may need multiple attempts
- Check Replicate dashboard for build status

### Permission Errors
```bash
# Fix file permissions locally
chmod +x scripts/*.sh
git add . && git commit -m "Fix permissions"
```

### Token Expiry
- Regenerate REPLICATE_CLI_AUTH_TOKEN
- Update GitHub repository secret
- Re-run failed workflows

### Memory Issues
- Reduce batch_size in predict.py
- Use smaller base Docker image
- Optimize model loading

## 📚 Resources

- [Replicate Documentation](https://replicate.com/docs)
- [Cog Documentation](https://github.com/replicate/cog)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🎉 Success Metrics

After successful setup, you should see:
- ✅ All CI checks passing
- 🚀 Successful deployments to Replicate
- 📈 Model available at https://replicate.com/username/model-name
- 🔄 Automated deployments on every push to main

---
*Last updated: January 2025* 