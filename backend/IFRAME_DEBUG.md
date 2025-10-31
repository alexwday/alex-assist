# Iframe Debug Instructions

The saved HTML file works but the iframe doesn't. This means there's a difference between:
1. How the browser reads the saved file (works ✅)
2. How the iframe receives the HTTP response (fails ❌)

## Test on Your Work Computer

### Step 1: Check what headers the iframe is actually receiving

1. Open the widget with the browser iframe
2. Open Chrome/Firefox Developer Tools (F12)
3. Go to the **Network** tab
4. Enter `https://google.ca` in the widget
5. In Network tab, find the request to `/api/browser/proxy?url=...`
6. Click on it and look at the **Response Headers** section
7. Take a screenshot showing:
   - Request URL
   - Response Headers (especially **Content-Type**)
   - Status code

### Step 2: Test the UTF-8 test endpoint directly

1. In the widget, navigate to: `http://localhost:8000/api/browser/debug/test-utf8`
2. You should see a test page with special characters:
   - French: Café, résumé
   - German: Über, Größe
   - Chinese: 你好世界
   - Emoji: 🌍 🚀 ✅

3. If you see weird symbols here too, the problem is confirmed to be headers
4. If you see correct characters, the problem is specific to the proxy endpoint

### Step 3: Compare headers

Open the saved `test_endpoint_response.html` file and in Developer Tools:
1. Go to Network tab
2. Find the request for the HTML file
3. Look at Response Headers
4. Compare to Step 1 headers

## What to Look For

The Content-Type header should be:
```
Content-Type: text/html; charset=utf-8
```

**Not:**
- `Content-Type: text/html` (missing charset)
- `Content-Type: text/html; charset=iso-8859-1`
- `Content-Type: application/octet-stream`

## Possible Causes

1. **CORS preflight removing headers** - Iframe might be stripping headers
2. **Sandbox attribute** - `sandbox="allow-same-origin..."` might affect encoding
3. **FastAPI not sending header** - media_type parameter not working as expected
4. **Proxy middleware** - Something between backend and iframe modifying headers

## Quick Test

Try this in browser console while viewing the widget:

```javascript
fetch('http://localhost:8000/api/browser/proxy?url=https%3A%2F%2Fgoogle.ca')
  .then(response => {
    console.log('Content-Type:', response.headers.get('content-type'));
    return response.text();
  })
  .then(html => {
    console.log('HTML length:', html.length);
    console.log('First 200 chars:', html.substring(0, 200));
  });
```

This will show exactly what Content-Type header the browser is seeing.
