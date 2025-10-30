#!/usr/bin/env python3
"""
Standalone debugging script for testing the browser proxy functionality.
Run this from your venv to diagnose encoding and compression issues.

Usage:
    source venv/bin/activate
    python debug_proxy.py [url]

Example:
    python debug_proxy.py https://www.google.ca
"""

import sys
import asyncio
import httpx
import gzip
import zlib
from pathlib import Path

# Add the app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import config
from loguru import logger

# Configure detailed logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="DEBUG",
    colorize=True
)


async def test_proxy(url: str):
    """Test fetching a URL through the corporate proxy (if configured)."""

    print("=" * 80)
    print("🔍 PROXY DEBUGGING TOOL")
    print("=" * 80)
    print()

    # Show configuration
    print("📋 CONFIGURATION:")
    print(f"  Environment: {config.env}")
    print(f"  Proxy configured: {config.get_proxy_dict() is not None}")
    if config.get_proxy_dict():
        print(f"  Proxy URL: {list(config.get_proxy_dict().values())[0]}")
    print()

    print(f"🌐 Testing URL: {url}")
    print()

    # Setup client
    client_kwargs = {
        "timeout": 30.0,
        "follow_redirects": True,
    }

    if config.get_proxy_dict():
        client_kwargs["proxies"] = config.get_proxy_dict()
        logger.info("Using corporate proxy")

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
    }

    try:
        async with httpx.AsyncClient(**client_kwargs) as client:
            logger.info(f"Fetching {url}...")
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            # Response info
            print("✅ REQUEST SUCCESSFUL")
            print()
            print("📥 RESPONSE HEADERS:")
            for key, value in response.headers.items():
                print(f"  {key}: {value}")
            print()

            # Content analysis
            raw_content = response.content
            content_type = response.headers.get("Content-Type", "")
            content_encoding = response.headers.get("content-encoding", "").lower()

            print("📊 CONTENT ANALYSIS:")
            print(f"  Content-Type: {content_type}")
            print(f"  Content-Encoding header: '{content_encoding}'")
            print(f"  Raw content length: {len(raw_content)} bytes")
            print(f"  First 50 bytes (hex): {raw_content[:50].hex()}")
            print()

            # Check compression via magic bytes
            is_gzip = raw_content[:2] == b'\x1f\x8b'
            is_deflate = raw_content[:2] == b'\x78\x9c' or raw_content[:2] == b'\x78\x01'
            is_brotli = raw_content[:2] == b'\xce\xb2' or raw_content[:2] == b'\x21\x2c'

            print("🔎 COMPRESSION DETECTION (via magic bytes):")
            print(f"  Appears to be gzip: {is_gzip} {'✅' if is_gzip else ''}")
            print(f"  Appears to be deflate: {is_deflate} {'✅' if is_deflate else ''}")
            print(f"  Appears to be brotli: {is_brotli} {'✅' if is_brotli else ''}")
            print()

            # Try decompression
            decompressed_content = raw_content
            decompression_method = "none"

            if is_gzip:
                try:
                    logger.info("Attempting gzip decompression...")
                    decompressed_content = gzip.decompress(raw_content)
                    decompression_method = "gzip"
                    print(f"✅ Successfully decompressed with gzip: {len(raw_content)} → {len(decompressed_content)} bytes")
                except Exception as e:
                    print(f"❌ Failed to decompress gzip: {e}")
            elif is_deflate:
                try:
                    logger.info("Attempting deflate decompression...")
                    decompressed_content = zlib.decompress(raw_content, -zlib.MAX_WBITS)
                    decompression_method = "deflate"
                    print(f"✅ Successfully decompressed with deflate: {len(raw_content)} → {len(decompressed_content)} bytes")
                except Exception as e:
                    print(f"❌ Failed to decompress deflate: {e}")
            elif is_brotli:
                try:
                    import brotli
                    logger.info("Attempting brotli decompression...")
                    decompressed_content = brotli.decompress(raw_content)
                    decompression_method = "brotli"
                    print(f"✅ Successfully decompressed with brotli: {len(raw_content)} → {len(decompressed_content)} bytes")
                except ImportError:
                    print("❌ brotli module not installed")
                except Exception as e:
                    print(f"❌ Failed to decompress brotli: {e}")
            else:
                print("ℹ️  No compression detected, using raw content")

            print()

            # Encoding detection
            print("🔤 CHARACTER ENCODING DETECTION:")

            # Try chardet
            try:
                import chardet
                detected = chardet.detect(decompressed_content[:10000])
                print(f"  chardet detection: {detected['encoding']} (confidence: {detected['confidence']:.2%})")
            except ImportError:
                print("  chardet: Not installed")
            except Exception as e:
                print(f"  chardet: Error - {e}")

            # Check Content-Type header
            encoding_from_header = None
            if 'charset=' in content_type.lower():
                encoding_from_header = content_type.lower().split('charset=')[-1].split(';')[0].strip()
                print(f"  From Content-Type header: {encoding_from_header}")

            # Check HTML meta tag
            try:
                import re
                head_str = decompressed_content[:2048].decode('utf-8', errors='ignore')
                charset_match = re.search(r'charset=["\']?([^"\'>\s]+)', head_str, re.IGNORECASE)
                if charset_match:
                    print(f"  From HTML meta tag: {charset_match.group(1)}")
            except:
                pass

            print()

            # Try to decode and show preview
            print("📄 CONTENT PREVIEW:")

            # Try UTF-8 first
            try:
                decoded_utf8 = decompressed_content.decode('utf-8')
                print("  ✅ UTF-8 decoding successful")
                print(f"  First 300 characters:")
                print("  " + "-" * 70)
                print("  " + decoded_utf8[:300].replace("\n", "\n  "))
                print("  " + "-" * 70)
            except Exception as e:
                print(f"  ❌ UTF-8 decoding failed: {e}")

                # Try with detected encoding
                if encoding_from_header:
                    try:
                        decoded = decompressed_content.decode(encoding_from_header, errors='replace')
                        print(f"  ✅ {encoding_from_header} decoding successful (with error replacement)")
                        print(f"  First 300 characters:")
                        print("  " + "-" * 70)
                        print("  " + decoded[:300].replace("\n", "\n  "))
                        print("  " + "-" * 70)
                    except Exception as e2:
                        print(f"  ❌ {encoding_from_header} decoding also failed: {e2}")

            print()
            print("=" * 80)
            print("📊 SUMMARY:")
            print(f"  Status: {response.status_code}")
            print(f"  Compression: {decompression_method}")
            print(f"  Original size: {len(raw_content)} bytes")
            print(f"  Decompressed size: {len(decompressed_content)} bytes")
            print(f"  Content-Type: {content_type}")
            print("=" * 80)

            # Save raw content for inspection
            output_file = Path("debug_response_raw.bin")
            with open(output_file, "wb") as f:
                f.write(raw_content)
            print(f"\n💾 Raw content saved to: {output_file}")

            if decompression_method != "none":
                output_file_decompressed = Path("debug_response_decompressed.html")
                with open(output_file_decompressed, "wb") as f:
                    f.write(decompressed_content)
                print(f"💾 Decompressed content saved to: {output_file_decompressed}")

    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP Error: {e.response.status_code}")
        print(f"Response: {e.response.text[:500]}")
    except httpx.TimeoutException:
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

    asyncio.run(test_proxy(url))


if __name__ == "__main__":
    main()
