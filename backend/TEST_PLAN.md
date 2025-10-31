# Browser Proxy Encoding - Test Plan

## Problem Summary

**Working:** Test script saves HTML to file → file opens correctly in browser ✅
**Broken:** Iframe loads HTML from API → displays garbled text (mojibake) ❌

This suggests the HTTP headers sent to the iframe are not correct.

## Test Sequence (Run on Work Computer)

### Test 1: UTF-8 Test Page (Simplest Test)

**Purpose:** Verify basic UTF-8 encoding works in iframe

1. Start backend: `python -m app.main`
2. In the browser widget, navigate to: `http://localhost:8000/api/browser/debug/test-utf8`
3. You should see readable special characters:
   - Café, résumé (French)
   - Über, Größe (German)
   - 你好世界 (Chinese)
   - 🌍 🚀 (Emoji)

**Expected Results:**
- ✅ **If readable**: FastAPI HTML encoding works, problem is specific to proxy
- ❌ **If garbled**: FastAPI HTML encoding is broken, need to use Response with bytes

---

### Test 2: Proxy Endpoint (Current Approach)

**Purpose:** Test current proxy endpoint

1. In widget, navigate to: `https://google.ca`
2. Check Developer Tools → Network tab → Find `/api/browser/proxy?url=...` request
3. Look at Response Headers → Find `Content-Type`

**Expected Results:**
- Should be: `Content-Type: text/html; charset=utf-8`
- If missing `charset=utf-8`, that's the problem

**Screenshot needed:**
- Response Headers section showing Content-Type

---

### Test 3: Alternative Proxy V2 Endpoint

**Purpose:** Test if explicit byte encoding fixes the issue

1. Temporarily modify frontend `BrowserFrame.tsx` line 30:
   ```typescript
   // Change from:
   const proxyUrl = url ? `${API_BASE_URL}/api/browser/proxy?url=${encodeURIComponent(url)}` : '';

   // To:
   const proxyUrl = url ? `${API_BASE_URL}/api/browser/proxy-v2?url=${encodeURIComponent(url)}` : '';
   ```

2. Restart frontend
3. Try navigating to `https://google.ca` again

**Expected Results:**
- ✅ **If readable**: HTMLResponse was the problem, use proxy-v2 approach
- ❌ **If still garbled**: Problem is deeper (iframe sandbox, CORS, etc.)

---

### Test 4: Direct Fetch Test

**Purpose:** Bypass iframe to see if browser can decode the response

1. Open browser console (F12)
2. Run this JavaScript:
   ```javascript
   fetch('http://localhost:8000/api/browser/proxy?url=https%3A%2F%2Fgoogle.ca')
     .then(response => {
       console.log('Headers:', Object.fromEntries(response.headers.entries()));
       console.log('Content-Type:', response.headers.get('content-type'));
       return response.text();
     })
     .then(html => {
       console.log('HTML length:', html.length);
       console.log('First 500 chars:', html.substring(0, 500));
       console.log('Contains readable text:', html.includes('Google'));
     });
   ```

**Expected Results:**
- Should show Content-Type header
- Should show readable HTML in console
- If console shows garbled text, the bytes themselves are wrong
- If console shows readable text but iframe doesn't, it's iframe-specific

---

### Test 5: Check Backend Logs

**Purpose:** See what the server thinks it's sending

1. Backend terminal should show DEBUG logs like:
   ```
   [PROXY] Content type: <class 'str'>
   [PROXY] Has charset meta tag in HTML: True
   [PROXY] Response headers after creation: {'content-type': 'text/html; charset=utf-8', ...}
   ```

2. If logs show `charset=utf-8`, server is sending correct headers

**Screenshot needed:**
- Backend terminal logs when loading a page

---

## Decision Tree

```
Test 1 (UTF-8 Test Page):
├── ✅ Readable
│   └── FastAPI encoding OK
│       └── Go to Test 2
└── ❌ Garbled
    └── FastAPI HTMLResponse broken
        └── **Solution: Use proxy-v2 endpoint**
        └── Update BrowserFrame.tsx to use /api/browser/proxy-v2

Test 2 (Current Proxy):
├── Headers show charset=utf-8
│   └── Headers correct, but still garbled
│       └── Go to Test 3
└── Headers missing charset
    └── **Solution: Fix header setting in browser.py**

Test 3 (Proxy V2):
├── ✅ Readable
│   └── HTMLResponse was the problem
│       └── **Solution: Switch to proxy-v2 permanently**
└── ❌ Still garbled
    └── Problem is iframe-specific
        └── Go to Test 4

Test 4 (Direct Fetch):
├── Console shows readable HTML
│   └── Iframe sandbox is the problem
│       └── **Solution: Modify iframe sandbox attribute**
│       └── Try removing sandbox or adding flags
└── Console shows garbled HTML
    └── Bytes are actually wrong
        └── **Solution: Check BeautifulSoup encoding**
```

---

## Solutions Based on Test Results

### Solution A: Switch to proxy-v2

If Test 3 works but Test 2 doesn't:

1. Update `BrowserFrame.tsx` line 30 to use `proxy-v2`
2. Keep both endpoints for backwards compatibility
3. Done!

### Solution B: Fix iframe sandbox

If Test 4 console works but iframe doesn't:

1. Modify `BrowserFrame.tsx` line 113:
   ```typescript
   // Try removing sandbox
   <iframe
     ref={iframeRef}
     src={proxyUrl}
     // Remove or modify: sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
     ...
   />
   ```

2. Or try adding `allow-downloads` flag

### Solution C: Force BOM (Byte Order Mark)

If nothing else works, add UTF-8 BOM to beginning of HTML:

```python
# In browser.py proxy endpoint
html_content = '\ufeff' + html_content  # Add UTF-8 BOM
```

### Solution D: Use srcdoc instead of src

Instead of loading from URL, inject HTML directly:

```typescript
<iframe
  ref={iframeRef}
  srcDoc={htmlContent}  // Inject HTML directly
  ...
/>
```

But this requires fetching HTML in React instead of letting iframe load it.

---

## What to Report Back

Please provide:

1. **Test 1 Result:** Screenshot of UTF-8 test page
2. **Test 2 Result:** Screenshot of Network tab showing Content-Type header
3. **Test 3 Result:** Does proxy-v2 work? (Yes/No + screenshot)
4. **Test 4 Result:** Console output from fetch test
5. **Test 5 Result:** Backend log output

With these results, I can determine the exact fix needed.
