"""
Browser proxy service for handling CORS and serving web pages through iframe
"""

import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Optional
import logging
from app.config import config

logger = logging.getLogger(__name__)

class BrowserProxyService:
    """
    Proxy service to fetch web pages and rewrite URLs for iframe display
    Handles CORS issues by fetching pages server-side and removing security headers
    """

    def __init__(self):
        self.timeout = 30.0
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        # Get proxy configuration from config (for RBC environment)
        self.proxy_config = config.get_proxy_dict()

    async def fetch_page(self, url: str) -> tuple[Optional[str], Optional[str], Optional[dict]]:
        """
        Fetch a web page and return its content, rewritten for iframe display

        Args:
            url: The URL to fetch

        Returns:
            Tuple of (html_content, error_message, headers)
        """
        try:
            # Validate URL
            if not self._is_valid_url(url):
                return None, "Invalid URL provided", None

            # Check for SSRF protection
            if self._is_internal_url(url):
                return None, "Access to internal URLs is not allowed", None

            # Fetch the page with proxy support (for RBC environment)
            client_kwargs = {
                "timeout": self.timeout,
                "follow_redirects": True,
            }
            if self.proxy_config:
                client_kwargs["proxies"] = self.proxy_config
                logger.info(f"Using proxy configuration for request to {url}")

            async with httpx.AsyncClient(**client_kwargs) as client:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                # Only process HTML content
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type:
                    return None, f"Non-HTML content type: {content_type}", None

                # Log ALL response headers for debugging
                logger.debug("=" * 80)
                logger.debug(f"[PROXY DEBUG] URL: {url}")
                logger.debug(f"[PROXY DEBUG] Response Headers:")
                for key, value in response.headers.items():
                    logger.debug(f"  {key}: {value}")
                logger.debug(f"[PROXY DEBUG] Content length: {len(response.content)} bytes")
                logger.debug(f"[PROXY DEBUG] First 50 bytes (hex): {response.content[:50].hex()}")

                # Better encoding detection with multiple fallbacks
                import re
                import gzip
                import zlib

                # Try to import chardet, but don't fail if not available
                try:
                    import chardet
                    has_chardet = True
                except ImportError:
                    has_chardet = False
                    logger.warning("chardet not installed, encoding detection may be less accurate")

                # Explicit decompression handling (in case proxy doesn't decompress)
                raw_content = response.content
                content_encoding = response.headers.get("content-encoding", "").lower()

                logger.debug(f"[PROXY DEBUG] Content-Encoding header: '{content_encoding}'")

                # Check if content is actually compressed (magic bytes)
                is_gzip = raw_content[:2] == b'\x1f\x8b'
                is_deflate = raw_content[:2] == b'\x78\x9c' or raw_content[:2] == b'\x78\x01'

                logger.debug(f"[PROXY DEBUG] Appears to be gzip: {is_gzip}")
                logger.debug(f"[PROXY DEBUG] Appears to be deflate: {is_deflate}")

                # Manually decompress if needed
                decompressed_content = raw_content
                if is_gzip:
                    try:
                        logger.info("Content is gzip compressed, decompressing manually...")
                        decompressed_content = gzip.decompress(raw_content)
                        logger.info(f"Successfully decompressed gzip content: {len(raw_content)} -> {len(decompressed_content)} bytes")
                    except Exception as e:
                        logger.error(f"Failed to decompress gzip content: {e}")
                        # Try to continue with raw content
                elif is_deflate or content_encoding in ['deflate', 'compress']:
                    try:
                        logger.info("Content is deflate compressed, decompressing manually...")
                        decompressed_content = zlib.decompress(raw_content, -zlib.MAX_WBITS)
                        logger.info(f"Successfully decompressed deflate content: {len(raw_content)} -> {len(decompressed_content)} bytes")
                    except Exception as e:
                        logger.error(f"Failed to decompress deflate content: {e}")
                        # Try to continue with raw content
                elif content_encoding == 'br':
                    try:
                        import brotli
                        logger.info("Content is brotli compressed, decompressing manually...")
                        decompressed_content = brotli.decompress(raw_content)
                        logger.info(f"Successfully decompressed brotli content: {len(raw_content)} -> {len(decompressed_content)} bytes")
                    except ImportError:
                        logger.warning("brotli not installed, cannot decompress br encoding")
                    except Exception as e:
                        logger.error(f"Failed to decompress brotli content: {e}")

                # Use decompressed content for further processing
                response_content = decompressed_content
                logger.debug(f"[PROXY DEBUG] Final content length: {len(response_content)} bytes")
                logger.debug(f"[PROXY DEBUG] First 50 bytes after decompression (hex): {response_content[:50].hex()}")

                # 1. Try to get charset from Content-Type header
                encoding = None
                if 'charset=' in content_type.lower():
                    try:
                        encoding = content_type.lower().split('charset=')[-1].split(';')[0].strip()
                        logger.debug(f"[PROXY DEBUG] Encoding from Content-Type: {encoding}")
                    except:
                        pass

                # 2. Try to detect from HTML meta tags
                if not encoding or encoding.lower() in ['iso-8859-1', 'ascii']:
                    # Look for charset in first 2048 bytes with UTF-8 attempt first
                    head_bytes = response_content[:2048]
                    # Try UTF-8 first to see if meta charset says UTF-8
                    try:
                        head_str = head_bytes.decode('utf-8', errors='ignore')
                        charset_match = re.search(r'charset=["\']?([^"\'>\s]+)', head_str, re.IGNORECASE)
                        if charset_match:
                            meta_encoding = charset_match.group(1).lower()
                            logger.debug(f"[PROXY DEBUG] Encoding from HTML meta: {meta_encoding}")
                            if meta_encoding == 'utf-8':
                                encoding = 'utf-8'
                    except:
                        pass

                # 3. Use chardet to detect encoding if we don't trust the header
                if has_chardet and (not encoding or encoding.lower() in ['iso-8859-1', 'ascii']):
                    try:
                        detected = chardet.detect(response_content[:10000])
                        if detected and detected.get('confidence', 0) > 0.7:
                            encoding = detected['encoding']
                            logger.debug(f"[PROXY DEBUG] Encoding from chardet: {encoding} (confidence: {detected.get('confidence')})")
                    except Exception as e:
                        logger.debug(f"[PROXY DEBUG] chardet detection failed: {e}")

                # 4. Fallback to utf-8 if nothing detected or low confidence
                if not encoding:
                    encoding = 'utf-8'

                logger.debug(f"[PROXY DEBUG] Final encoding to use: {encoding}")
                logger.debug("=" * 80)
                logger.info(f"Detected encoding: {encoding} for {url}")

                # Decode with detected encoding
                try:
                    html_content = response_content.decode(encoding, errors='replace')
                    logger.debug(f"[PROXY DEBUG] Successfully decoded with {encoding}")
                    logger.debug(f"[PROXY DEBUG] First 200 chars of decoded HTML: {html_content[:200]}")
                except Exception as e:
                    logger.debug(f"[PROXY DEBUG] Decode with {encoding} failed: {e}, trying UTF-8")
                    # Last resort: force utf-8 with error replacement
                    html_content = response_content.decode('utf-8', errors='replace')
                    logger.debug(f"[PROXY DEBUG] First 200 chars of decoded HTML (UTF-8): {html_content[:200]}")

                # Rewrite URLs in the HTML to route through proxy
                rewritten_html = self._rewrite_urls(html_content, url)

                # Prepare safe headers for iframe
                safe_headers = self._get_safe_headers(response.headers)

                return rewritten_html, None, safe_headers

        except httpx.TimeoutException:
            logger.error(f"Timeout fetching URL: {url}")
            return None, "Request timed out", None
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching URL {url}: {e.response.status_code}")
            return None, f"HTTP error: {e.response.status_code}", None
        except Exception as e:
            logger.error(f"Error fetching URL {url}: {str(e)}")
            return None, f"Error fetching page: {str(e)}", None

    def _rewrite_urls(self, html: str, base_url: str) -> str:
        """
        Rewrite relative and absolute URLs in HTML to absolute URLs
        This ensures resources load correctly in the iframe

        Args:
            html: The HTML content
            base_url: The base URL of the page

        Returns:
            Modified HTML with rewritten URLs
        """
        try:
            soup = BeautifulSoup(html, 'lxml')

            # Rewrite <a> tags
            for tag in soup.find_all('a', href=True):
                tag['href'] = urljoin(base_url, tag['href'])

            # Rewrite <img> tags
            for tag in soup.find_all('img', src=True):
                tag['src'] = urljoin(base_url, tag['src'])

            # Rewrite <link> tags (stylesheets, etc.)
            for tag in soup.find_all('link', href=True):
                tag['href'] = urljoin(base_url, tag['href'])

            # Rewrite <script> tags
            for tag in soup.find_all('script', src=True):
                tag['src'] = urljoin(base_url, tag['src'])

            # Rewrite <form> actions
            for tag in soup.find_all('form', action=True):
                tag['action'] = urljoin(base_url, tag['action'])

            # Add base tag to help with any remaining relative URLs
            base_tag = soup.new_tag('base', href=base_url)
            if soup.head:
                soup.head.insert(0, base_tag)

            return str(soup)
        except Exception as e:
            logger.warning(f"Error rewriting URLs: {str(e)}. Returning original HTML.")
            return html

    def _get_safe_headers(self, original_headers: dict) -> dict:
        """
        Strip security headers that prevent iframe embedding and encoding headers that cause display issues

        Args:
            original_headers: The original response headers

        Returns:
            Filtered headers safe for iframe display
        """
        # Headers to remove for iframe compatibility and proper content display
        unsafe_headers = {
            'x-frame-options',
            'content-security-policy',
            'x-content-security-policy',
            'x-webkit-csp',
            # Strip content-encoding headers as httpx has already decompressed the content
            # If we leave these, the browser will try to decompress already-decompressed content
            'content-encoding',
            'transfer-encoding',
            # Also strip content-length as it may be incorrect after our modifications
            'content-length',
        }

        safe_headers = {}
        for key, value in original_headers.items():
            if key.lower() not in unsafe_headers:
                safe_headers[key] = value

        logger.debug(f"[PROXY DEBUG] Stripped headers: {[k for k in original_headers.keys() if k.lower() in unsafe_headers]}")

        return safe_headers

    def _is_valid_url(self, url: str) -> bool:
        """
        Check if URL is valid

        Args:
            url: The URL to validate

        Returns:
            True if valid, False otherwise
        """
        try:
            result = urlparse(url)
            return all([result.scheme in ['http', 'https'], result.netloc])
        except Exception:
            return False

    def _is_internal_url(self, url: str) -> bool:
        """
        Check if URL points to internal/localhost addresses (SSRF protection)

        Args:
            url: The URL to check

        Returns:
            True if internal URL, False otherwise
        """
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname

            if not hostname:
                return True

            # Block localhost, 127.0.0.1, and private IP ranges
            blocked_hosts = [
                'localhost',
                '127.0.0.1',
                '0.0.0.0',
                '::1',
            ]

            if hostname.lower() in blocked_hosts:
                return True

            # Block private IP ranges (simple check)
            if hostname.startswith('10.') or hostname.startswith('192.168.') or hostname.startswith('172.'):
                return True

            return False
        except Exception:
            return True  # Err on the side of caution

# Global instance
browser_proxy_service = BrowserProxyService()
