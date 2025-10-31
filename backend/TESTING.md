# Browser Proxy Testing Guide

This guide contains test scripts to diagnose and fix browser proxy encoding issues.

## Prerequisites

```bash
cd backend
source venv/bin/activate
```

## Test Scripts

### 1. `debug_proxy.py` - Direct HTTP Fetch Test

Tests fetching a URL directly through httpx (bypassing the API).

**Usage:**
```bash
python debug_proxy.py https://www.google.ca
```

**What it does:**
- Fetches the URL directly with httpx
- Shows all HTTP headers
- Detects compression (gzip, deflate, brotli)
- Decompresses content if needed
- Detects character encoding
- Saves raw and decompressed content to files

**Output files:**
- `debug_response_raw.bin` - Raw response from server
- `debug_response_decompressed.html` - Decompressed HTML (if compressed)

---

### 2. `test_browser_proxy_endpoint.py` - API Endpoint Test

Tests the actual browser proxy API endpoint.

**Usage:**
```bash
# Start the server first in another terminal:
python -m app.main

# Then run the test:
python test_browser_proxy_endpoint.py https://www.google.ca
```

**What it does:**
- Makes HTTP request to `/api/browser/proxy`
- Shows response headers and content
- Checks for common encoding issues
- Saves response to files

**Output files:**
- `test_endpoint_response.html` - Raw response from API
- `test_endpoint_response.txt` - Decoded response

---

### 3. `test_comparison.py` - Side-by-Side Comparison

Compares direct service call vs API endpoint to identify where issues occur.

**Usage:**
```bash
# Start the server first in another terminal:
python -m app.main

# Then run the test:
python test_comparison.py https://www.google.ca
```

**What it does:**
- Test 1: Calls `browser_proxy_service.fetch_page()` directly
- Test 2: Makes HTTP request to API endpoint
- Compares both outputs to find differences
- Shows exactly where the encoding issue occurs

**Output files:**
- `test_direct_service.html` - Direct service call output
- `test_api_endpoint.html` - API endpoint raw output
- `test_api_endpoint.txt` - API endpoint decoded output

---

### 4. `test_prettify_encoding.py` - BeautifulSoup Encoding Test

Tests different BeautifulSoup string conversion methods.

**Usage:**
```bash
python test_prettify_encoding.py
```

**What it does:**
- Compares `str(soup)` vs `prettify()` methods
- Tests encoding/decoding round-trips
- Shows how special characters are handled
- No server needed

---

## Common Issues and Solutions

### Issue 1: "Debug mode is false"

**Cause:** Server not restarted after changing .env file

**Solution:**
1. Check `.env` file has `DEBUG=true`
2. Restart the server: Stop with Ctrl+C, then `python -m app.main`
3. Look for startup message: "Debug Mode: True"

---

### Issue 2: "Weird symbols instead of webpage"

**Cause:** Encoding issue in HTML response

**Debugging steps:**
1. Run `test_comparison.py` to see where issue occurs
2. Check if direct service call works (Test 1)
3. Check if API endpoint fails (Test 2)
4. Look for differences in output files

**Potential causes:**
- Double encoding (UTF-8 bytes encoded as UTF-8 string)
- Wrong Content-Type header
- Compression not handled correctly
- BeautifulSoup prettify() changing encoding

---

### Issue 3: "brotli not installed"

**Cause:** Missing brotli library

**Solution:**
```bash
pip install brotli
```

Already added to `requirements.txt`.

---

### Issue 4: Logging not showing

**Cause:** Log level too high or logger not configured

**Debugging steps:**
1. Check startup message shows: "Logger configured - Level: DEBUG"
2. If it says "INFO", check `.env` has `DEBUG=true`
3. Restart server
4. Check for `[PROXY DEBUG]` messages in logs

---

## How to Report Issues

When reporting issues on your work computer, run these commands and paste the output:

```bash
# 1. Test direct fetch
python debug_proxy.py https://www.google.ca > debug_output.txt 2>&1

# 2. Test API endpoint (server must be running)
python test_browser_proxy_endpoint.py https://www.google.ca > endpoint_output.txt 2>&1

# 3. Run comparison
python test_comparison.py https://www.google.ca > comparison_output.txt 2>&1
```

Then share:
1. `debug_output.txt`
2. `endpoint_output.txt`
3. `comparison_output.txt`
4. First 500 characters from `test_endpoint_response.html`

---

## Understanding the Output

### Good Response Signs (✅)
- "UTF-8 decoding successful"
- "No obvious issues detected"
- "Appears to be HTML: True"
- Content preview shows readable HTML

### Bad Response Signs (❌)
- "Content appears to be gzip compressed but no Content-Encoding header"
- "Content contains escape sequences - might be double-encoded"
- "Appears to be HTML: False"
- Content preview shows hex codes or garbled text

---

## Recent Fixes Applied

1. **Added brotli support** - Can now decompress Brotli-encoded responses
2. **Changed prettify() to str(soup)** - More reliable encoding preservation
3. **Explicit UTF-8 encoding** - Ensures consistent character handling
4. **Removed Content-Encoding headers** - Prevents browser re-decompression

---

## Next Steps if Issues Persist

If tests show problems on work computer:

1. Run all test scripts
2. Save all output files
3. Share outputs with development team
4. Include:
   - Operating system
   - Python version (`python --version`)
   - Browser being used
   - Screenshot of "weird symbols" in widget
