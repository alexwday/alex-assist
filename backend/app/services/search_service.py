"""
Search service using DuckDuckGo
"""

from duckduckgo_search import DDGS
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class SearchService:
    """
    Service for performing web searches using DuckDuckGo
    """

    def __init__(self):
        self.ddgs = DDGS()

    async def search(
        self,
        query: str,
        max_results: int = 10,
        region: str = "wt-wt",  # Worldwide
    ) -> Dict[str, Any]:
        """
        Perform a web search using DuckDuckGo

        Args:
            query: The search query string
            max_results: Maximum number of results to return
            region: Region code for localized results

        Returns:
            Dictionary containing search results
        """
        try:
            # Perform the search
            results = list(self.ddgs.text(
                keywords=query,
                region=region,
                max_results=max_results,
            ))

            # Format results
            formatted_results = []
            for idx, result in enumerate(results):
                formatted_results.append({
                    "index": idx,
                    "title": result.get("title", ""),
                    "url": result.get("href", result.get("link", "")),
                    "snippet": result.get("body", result.get("description", "")),
                })

            return {
                "success": True,
                "query": query,
                "results": formatted_results,
                "count": len(formatted_results),
            }

        except Exception as e:
            logger.error(f"Error performing search for '{query}': {str(e)}")
            return {
                "success": False,
                "query": query,
                "error": str(e),
                "results": [],
                "count": 0,
            }

    async def search_news(
        self,
        query: str,
        max_results: int = 10,
    ) -> Dict[str, Any]:
        """
        Search for news articles

        Args:
            query: The search query
            max_results: Maximum number of results

        Returns:
            Dictionary containing news results
        """
        try:
            results = list(self.ddgs.news(
                keywords=query,
                max_results=max_results,
            ))

            formatted_results = []
            for idx, result in enumerate(results):
                formatted_results.append({
                    "index": idx,
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "snippet": result.get("body", ""),
                    "source": result.get("source", ""),
                    "date": result.get("date", ""),
                })

            return {
                "success": True,
                "query": query,
                "results": formatted_results,
                "count": len(formatted_results),
            }

        except Exception as e:
            logger.error(f"Error performing news search for '{query}': {str(e)}")
            return {
                "success": False,
                "query": query,
                "error": str(e),
                "results": [],
                "count": 0,
            }

    def get_instant_answer(self, query: str) -> Optional[str]:
        """
        Get instant answer for a query (like a calculator or definition)

        Args:
            query: The query string

        Returns:
            Instant answer text if available, None otherwise
        """
        try:
            answers = self.ddgs.answers(query)
            if answers:
                # Return the first answer's text
                return answers[0].get("text", None)
            return None
        except Exception as e:
            logger.error(f"Error getting instant answer for '{query}': {str(e)}")
            return None

# Global instance
search_service = SearchService()
