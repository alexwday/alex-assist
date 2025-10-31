#!/usr/bin/env python3
"""
Test script to check if BeautifulSoup's prettify() is causing encoding issues.

Usage:
    source venv/bin/activate
    python test_prettify_encoding.py
"""

from bs4 import BeautifulSoup

def test_prettify_encoding():
    """Test different ways of converting BeautifulSoup to string."""

    # Sample HTML with special characters
    html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Page - Café & Résumé</title>
</head>
<body>
    <h1>Welcome to Google.ca</h1>
    <p>This is a test with special characters: é, à, ü, ñ, 中文</p>
</body>
</html>"""

    print("=" * 80)
    print("🧪 BEAUTIFULSOUP ENCODING TEST")
    print("=" * 80)
    print()

    print("ORIGINAL HTML:")
    print(html)
    print()
    print("-" * 80)
    print()

    # Parse with BeautifulSoup
    soup = BeautifulSoup(html, 'lxml')

    # Method 1: str(soup)
    print("METHOD 1: str(soup)")
    method1 = str(soup)
    print(f"Length: {len(method1)}")
    print(f"Type: {type(method1)}")
    print(f"First 200 chars: {method1[:200]}")
    print()

    # Method 2: soup.prettify()
    print("METHOD 2: soup.prettify()")
    method2 = soup.prettify()
    print(f"Length: {len(method2)}")
    print(f"Type: {type(method2)}")
    print(f"First 200 chars: {method2[:200]}")
    print()

    # Method 3: soup.prettify(formatter="html")
    print("METHOD 3: soup.prettify(formatter='html')")
    method3 = soup.prettify(formatter="html")
    print(f"Length: {len(method3)}")
    print(f"Type: {type(method3)}")
    print(f"First 200 chars: {method3[:200]}")
    print()

    # Method 4: soup.prettify(formatter=None)
    print("METHOD 4: soup.prettify(formatter=None)")
    method4 = soup.prettify(formatter=None)
    print(f"Length: {len(method4)}")
    print(f"Type: {type(method4)}")
    print(f"First 200 chars: {method4[:200]}")
    print()

    # Now test encoding to bytes
    print("=" * 80)
    print("ENCODING TO BYTES (UTF-8)")
    print("=" * 80)
    print()

    for i, method in enumerate([method1, method2, method3, method4], 1):
        print(f"METHOD {i} -> bytes:")
        try:
            encoded = method.encode('utf-8')
            print(f"  ✅ Success: {len(encoded)} bytes")
            print(f"  First 100 bytes (hex): {encoded[:100].hex()}")

            # Try decoding back
            decoded = encoded.decode('utf-8')
            if decoded == method:
                print(f"  ✅ Round-trip successful (identical)")
            else:
                print(f"  ⚠️  Round-trip changed the content")
        except Exception as e:
            print(f"  ❌ Failed: {e}")
        print()

    print("=" * 80)
    print("COMPARISON")
    print("=" * 80)
    print()

    print(f"str(soup) == prettify():             {method1 == method2}")
    print(f"str(soup) == prettify('html'):       {method1 == method3}")
    print(f"str(soup) == prettify(None):         {method1 == method4}")
    print(f"prettify() == prettify('html'):      {method2 == method3}")
    print(f"prettify() == prettify(None):        {method2 == method4}")
    print(f"prettify('html') == prettify(None):  {method3 == method4}")
    print()

    # Find specific differences
    print("=" * 80)
    print("SPECIAL CHARACTER HANDLING")
    print("=" * 80)
    print()

    test_chars = ['é', 'à', 'ü', 'ñ', '中文']
    for char in test_chars:
        print(f"Character '{char}':")
        for i, (name, method) in enumerate([
            ("str(soup)", method1),
            ("prettify()", method2),
            ("prettify('html')", method3),
            ("prettify(None)", method4)
        ], 1):
            if char in method:
                print(f"  ✅ {name}: Present")
            else:
                # Check if it was HTML-encoded
                import html as html_module
                encoded = html_module.escape(char)
                if encoded in method:
                    print(f"  ⚠️  {name}: HTML-encoded as '{encoded}'")
                else:
                    print(f"  ❌ {name}: Missing")
        print()


if __name__ == "__main__":
    test_prettify_encoding()
