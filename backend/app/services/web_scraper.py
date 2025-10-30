"""
Web scraping service using crawl4ai for intelligent content extraction
"""

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
from crawl4ai.extraction_strategy import LLMExtractionStrategy
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class WebScraperService:
    """
    Service for scraping web pages using crawl4ai
    Extracts clean content, links, and metadata
    """

    def __init__(self):
        self.browser_config = BrowserConfig(
            headless=True,
            verbose=False,
        )

    async def scrape_url(
        self,
        url: str,
        include_links: bool = True,
        format_markdown: bool = True,
    ) -> Dict[str, Any]:
        """
        Scrape a URL and extract its content

        Args:
            url: The URL to scrape
            include_links: Whether to extract links from the page
            format_markdown: Whether to convert content to markdown

        Returns:
            Dictionary containing scraped content and metadata
        """
        try:
            async with AsyncWebCrawler(config=self.browser_config) as crawler:
                crawler_config = CrawlerRunConfig(
                    cache_mode=CacheMode.ENABLED,
                    markdown_generator=DefaultMarkdownGenerator() if format_markdown else None,
                )

                result = await crawler.arun(
                    url=url,
                    config=crawler_config,
                )

                if not result.success:
                    logger.error(f"Failed to scrape {url}: {result.error_message}")
                    return {
                        "success": False,
                        "error": result.error_message or "Unknown error occurred",
                        "url": url,
                    }

                # Extract links if requested
                links = []
                if include_links and result.links:
                    links = [
                        {
                            "text": link.get("text", ""),
                            "url": link.get("href", ""),
                        }
                        for link in result.links.get("internal", [])[:20]  # Limit to first 20 internal links
                    ]

                # Get metadata
                metadata = {}
                if hasattr(result, 'metadata') and result.metadata:
                    metadata = {
                        "title": result.metadata.get("title", ""),
                        "description": result.metadata.get("description", ""),
                        "keywords": result.metadata.get("keywords", ""),
                        "author": result.metadata.get("author", ""),
                        "og_title": result.metadata.get("og:title", ""),
                        "og_description": result.metadata.get("og:description", ""),
                    }

                # Get content (markdown if requested, otherwise HTML)
                content = result.markdown if format_markdown else result.html

                return {
                    "success": True,
                    "url": url,
                    "title": metadata.get("title", ""),
                    "content": content[:50000],  # Limit content size for LLM
                    "links": links,
                    "metadata": metadata,
                    "scraped_at": datetime.utcnow().isoformat(),
                }

        except Exception as e:
            logger.error(f"Error scraping URL {url}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "url": url,
            }

    async def scrape_multiple_urls(
        self,
        urls: List[str],
        include_links: bool = True,
        format_markdown: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Scrape multiple URLs concurrently

        Args:
            urls: List of URLs to scrape
            include_links: Whether to extract links
            format_markdown: Whether to convert to markdown

        Returns:
            List of scrape results
        """
        results = []
        for url in urls:
            result = await self.scrape_url(url, include_links, format_markdown)
            results.append(result)

        return results

    async def extract_main_content(self, url: str) -> Optional[str]:
        """
        Extract just the main content from a URL (no metadata or links)

        Args:
            url: The URL to scrape

        Returns:
            The main content as markdown, or None if failed
        """
        result = await self.scrape_url(url, include_links=False, format_markdown=True)

        if result.get("success"):
            return result.get("content")

        return None

# Global instance
web_scraper_service = WebScraperService()
