# Installation Troubleshooting for RBC Environment

## Greenlet Compilation Error Solutions

If you're getting "failed building wheel for greenlet" or "cstdlib file not found", try these solutions in order:

### Solution 1: Force Binary Wheels (Recommended)
```bash
cd /path/to/alex-assist/backend
source venv/bin/activate
bash install_binary_only.sh
```

This forces pip to only use pre-compiled binary wheels, avoiding compilation entirely.

### Solution 2: Upgrade pip/setuptools First
```bash
cd /path/to/alex-assist/backend
source venv/bin/activate
bash upgrade_and_install.sh
```

Newer pip versions have better wheel compatibility and may find pre-built binaries for your platform.

### Solution 3: Install greenlet Separately
```bash
cd /path/to/alex-assist/backend
source venv/bin/activate
bash install_greenlet_first.sh
```

### Solution 4: Check Python Version
Run this to see your Python version:
```bash
python --version
```

If you're on Python 3.12+, some packages may not have pre-built wheels yet. Try using Python 3.10 or 3.11:
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Solution 5: Install Build Dependencies (if you have sudo)
If you have admin rights on your RBC machine:

**RHEL/CentOS:**
```bash
sudo yum install gcc gcc-c++ python3-devel
```

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential python3-dev
```

Then retry:
```bash
pip install -r requirements.txt
```

## Diagnostic Commands

Run these to gather information about your environment:

```bash
# Check Python version
python --version

# Check pip version
pip --version

# Check if gcc is available
which gcc

# Check platform details
python -c "import platform; print(platform.platform()); print(platform.machine())"

# Try installing just greenlet to see the exact error
pip install greenlet==3.0.3 --verbose
```

## Common Issues

### Issue: "cstdlib file not found"
**Cause:** Missing C++ compiler headers
**Solution:** Try Solution 1 (binary wheels) or Solution 5 (install build tools)

### Issue: "No matching distribution found"
**Cause:** No pre-built wheel for your platform/Python version
**Solution:** Try Solution 4 (different Python version)

### Issue: Works in other environment but not RBC
**Likely differences:**
- Different Python version (check with `python --version`)
- Different pip version (upgrade with `pip install --upgrade pip`)
- Different platform architecture (ARM vs x86_64)
- Corporate proxy interfering with wheel downloads

## If Nothing Works

Comment out crawl4ai and use simpler web scraping:

1. Edit `requirements.txt` and comment out:
```
# crawl4ai==0.3.74
```

2. Add these lightweight alternatives:
```
playwright>=1.40.0
```

3. We'll need to modify `web_scraper.py` to use Playwright directly instead of crawl4ai.

Let me know if you need help with this fallback approach.
