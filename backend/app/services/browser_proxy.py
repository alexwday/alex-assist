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

                # Ensure proper encoding detection
                # httpx handles decompression automatically, but we need to set encoding
                if response.encoding == 'ascii':
                    # Fallback to utf-8 if httpx detected ascii (often wrong)
                    response.encoding = 'utf-8'

                html_content = response.text

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
        Strip security headers that prevent iframe embedding

        Args:
            original_headers: The original response headers

        Returns:
            Filtered headers safe for iframe display
        """
        # Headers to remove for iframe compatibility
        unsafe_headers = {
            'x-frame-options',
            'content-security-policy',
            'x-content-security-policy',
            'x-webkit-csp',
        }

        safe_headers = {}
        for key, value in original_headers.items():
            if key.lower() not in unsafe_headers:
                safe_headers[key] = value

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
