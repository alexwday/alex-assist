#!/usr/bin/env python3
"""
Test script for the browser proxy API endpoint.
This tests the actual HTTP endpoint to see what's being returned.

Usage:
    source venv/bin/activate
    # Start the server first in another terminal: python -m app.main
    python test_browser_proxy_endpoint.py [url]

Example:
    python test_browser_proxy_endpoint.py https://www.google.ca
"""

import sys
import requests
from urllib.parse import quote
from pathlib import Path

def test_endpoint(url: str, api_url: str = "http://localhost:8000"):
    """Test the browser proxy endpoint."""

    print("=" * 80)
    print("🧪 BROWSER PROXY ENDPOINT TEST")
    print("=" * 80)
    print()

    print("📋 CONFIGURATION:")
    print(f"  API URL: {api_url}")
    print(f"  Target URL: {url}")
    print()

    # Encode the URL for the query parameter
    encoded_url = quote(url, safe='')
    endpoint = f"{api_url}/api/browser/proxy?url={encoded_url}"

    print(f"🌐 Testing endpoint: {endpoint}")
    print()

    try:
        # Make request to the API endpoint
        print("📤 Making request...")
        response = requests.get(endpoint, timeout=30)

        print(f"✅ Request successful - Status: {response.status_code}")
        print()

        # Response headers
        print("📥 RESPONSE HEADERS:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
        print()

        # Content analysis
        raw_content = response.content
        print("📊 CONTENT ANALYSIS:")
        print(f"  Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
        print(f"  Content-Encoding: {response.headers.get('Content-Encoding', 'Not specified')}")
        print(f"  Content-Length header: {response.headers.get('Content-Length', 'Not specified')}")
        print(f"  Actual content length: {len(raw_content)} bytes")
        print(f"  First 100 bytes (hex): {raw_content[:100].hex()}")
        print()

        # Check if it looks like HTML
        print("🔎 CONTENT TYPE DETECTION:")
        is_html = raw_content[:100].lower().find(b'<!doctype html') >= 0 or raw_content[:100].lower().find(b'<html') >= 0
        is_json = raw_content[:10].strip().startswith(b'{')
        print(f"  Appears to be HTML: {is_html} {'✅' if is_html else '❌'}")
        print(f"  Appears to be JSON: {is_json} {'✅' if is_json else '❌'}")
        print()

        # Try to decode
        print("📄 CONTENT PREVIEW:")

        # Try UTF-8
        try:
            decoded = response.text  # requests handles encoding automatically
            print(f"  ✅ Content decoded by requests library")
            print(f"  Character count: {len(decoded)}")
            print(f"  First 500 characters:")
            print("  " + "-" * 70)
            lines = decoded[:500].split('\n')
            for line in lines:
                print(f"  {line}")
            print("  " + "-" * 70)
        except Exception as e:
            print(f"  ❌ Failed to decode: {e}")

            # Try manual UTF-8
            try:
                decoded = raw_content.decode('utf-8')
                print(f"  ✅ Manual UTF-8 decoding successful")
                print(f"  First 500 characters:")
                print("  " + "-" * 70)
                print("  " + decoded[:500])
                print("  " + "-" * 70)
            except Exception as e2:
                print(f"  ❌ Manual UTF-8 also failed: {e2}")

        print()

        # Check for common issues
        print("⚠️  POTENTIAL ISSUES:")
        issues = []

        # Check if content is compressed despite no Content-Encoding header
        if raw_content[:2] == b'\x1f\x8b':
            issues.append("Content appears to be gzip compressed but no Content-Encoding header")

        # Check if content might be double-encoded
        if b'\\x' in raw_content[:1000]:
            issues.append("Content contains escape sequences - might be double-encoded")

        # Check if content-type is wrong
        content_type = response.headers.get('Content-Type', '')
        if 'text/html' not in content_type.lower():
            issues.append(f"Content-Type is '{content_type}' but should be 'text/html'")

        if issues:
            for issue in issues:
                print(f"  ⚠️  {issue}")
        else:
            print(f"  ✅ No obvious issues detected")

        print()

        # Save output for inspection
        output_file = Path("test_endpoint_response.html")
        with open(output_file, "wb") as f:
            f.write(raw_content)
        print(f"💾 Raw response saved to: {output_file}")

        # Also save as text
        try:
            output_text = Path("test_endpoint_response.txt")
            with open(output_text, "w", encoding='utf-8') as f:
                f.write(response.text)
            print(f"💾 Decoded response saved to: {output_text}")
        except:
            pass

        print()
        print("=" * 80)
        print("📊 SUMMARY:")
        print(f"  Status: {response.status_code}")
        print(f"  Response size: {len(raw_content)} bytes")
        print(f"  Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
        print(f"  Appears valid: {'✅ YES' if is_html else '❌ NO'}")
        print("=" * 80)

    except requests.exceptions.ConnectionError:
        print("❌ Connection failed - is the server running?")
        print("   Start it with: python -m app.main")
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = "https://www.google.ca"
        print(f"No URL provided, using default: {url}")
        print(f"Usage: python {sys.argv[0]} <url>")
        print()

    test_endpoint(url)


if __name__ == "__main__":
    main()
