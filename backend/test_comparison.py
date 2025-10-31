#!/usr/bin/env python3
"""
Comparison test: Direct fetch vs API endpoint.
This helps identify where the encoding issue occurs.

Usage:
    source venv/bin/activate
    # Start the server first in another terminal: python -m app.main
    python test_comparison.py [url]

Example:
    python test_comparison.py https://www.google.ca
"""

import sys
import asyncio
import httpx
import requests
from urllib.parse import quote
from pathlib import Path

# Add the app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import config
from app.services.browser_proxy import browser_proxy_service
from loguru import logger

# Configure detailed logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="DEBUG",
    colorize=True
)


async def test_direct_service(url: str):
    """Test the browser proxy service directly."""
    print("=" * 80)
    print("🔧 TEST 1: Direct Service Call")
    print("=" * 80)
    print()

    html_content, error, headers = await browser_proxy_service.fetch_page(url)

    if error:
        print(f"❌ Service returned error: {error}")
        return None

    print(f"✅ Service call successful")
    print()

    print("📊 RESULT ANALYSIS:")
    print(f"  HTML length: {len(html_content)} characters")
    print(f"  Type: {type(html_content)}")
    print(f"  First 500 characters:")
    print("  " + "-" * 70)
    lines = html_content[:500].split('\n')
    for line in lines:
        print(f"  {line}")
    print("  " + "-" * 70)
    print()

    # Save output
    output_file = Path("test_direct_service.html")
    with open(output_file, "w", encoding='utf-8') as f:
        f.write(html_content)
    print(f"💾 Direct service output saved to: {output_file}")
    print()

    return html_content


def test_api_endpoint(url: str, api_url: str = "http://localhost:8000"):
    """Test the API endpoint."""
    print("=" * 80)
    print("🌐 TEST 2: API Endpoint")
    print("=" * 80)
    print()

    encoded_url = quote(url, safe='')
    endpoint = f"{api_url}/api/browser/proxy?url={encoded_url}"

    try:
        response = requests.get(endpoint, timeout=30)
        print(f"✅ Endpoint call successful - Status: {response.status_code}")
        print()

        print("📊 RESULT ANALYSIS:")
        print(f"  Content-Type: {response.headers.get('Content-Type')}")
        print(f"  Content length: {len(response.content)} bytes")
        print(f"  Type: {type(response.content)}")

        # Check the raw bytes
        raw_content = response.content
        print(f"  First 100 bytes (hex): {raw_content[:100].hex()}")
        print()

        # Try to decode
        try:
            decoded = response.text
            print(f"  ✅ Decoded to {len(decoded)} characters")
            print(f"  First 500 characters:")
            print("  " + "-" * 70)
            lines = decoded[:500].split('\n')
            for line in lines:
                print(f"  {line}")
            print("  " + "-" * 70)
        except Exception as e:
            print(f"  ❌ Decode failed: {e}")
            decoded = None

        print()

        # Save output
        output_file = Path("test_api_endpoint.html")
        with open(output_file, "wb") as f:
            f.write(raw_content)
        print(f"💾 API endpoint raw output saved to: {output_file}")

        if decoded:
            output_text = Path("test_api_endpoint.txt")
            with open(output_text, "w", encoding='utf-8') as f:
                f.write(decoded)
            print(f"💾 API endpoint decoded output saved to: {output_text}")
        print()

        return decoded

    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None


def compare_outputs(direct: str, endpoint: str):
    """Compare the two outputs."""
    print("=" * 80)
    print("🔍 COMPARISON")
    print("=" * 80)
    print()

    if not direct or not endpoint:
        print("❌ One or both tests failed, cannot compare")
        return

    print(f"Direct service length: {len(direct)} characters")
    print(f"API endpoint length: {len(endpoint)} characters")
    print()

    if direct == endpoint:
        print("✅ Outputs are IDENTICAL")
    else:
        print("❌ Outputs are DIFFERENT")
        print()

        # Find first difference
        min_len = min(len(direct), len(endpoint))
        first_diff = None
        for i in range(min_len):
            if direct[i] != endpoint[i]:
                first_diff = i
                break

        if first_diff is not None:
            print(f"First difference at character {first_diff}:")
            print(f"  Direct:   ...{direct[max(0, first_diff-20):first_diff+20]!r}...")
            print(f"  Endpoint: ...{endpoint[max(0, first_diff-20):first_diff+20]!r}...")
        else:
            print(f"Content matches up to character {min_len}")
            if len(direct) != len(endpoint):
                print(f"But lengths differ: {len(direct)} vs {len(endpoint)}")

    print()


async def main_async():
    """Main entry point."""
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = "https://www.google.ca"
        print(f"No URL provided, using default: {url}")
        print(f"Usage: python {sys.argv[0]} <url>")
        print()

    print("🧪 COMPARATIVE TEST: Direct Service vs API Endpoint")
    print()
    print(f"Target URL: {url}")
    print()
    input("Press Enter to start tests (make sure server is running)...")
    print()

    # Test 1: Direct service call
    direct_result = await test_direct_service(url)

    print()

    # Test 2: API endpoint
    endpoint_result = test_api_endpoint(url)

    print()

    # Compare
    compare_outputs(direct_result, endpoint_result)


def main():
    """Sync wrapper."""
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
