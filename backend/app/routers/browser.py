"""
Browser API routes for proxy, scraping, and search functionality
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from app.services.browser_proxy import browser_proxy_service
from app.services.web_scraper import web_scraper_service
from app.services.search_service import search_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/browser", tags=["browser"])

# Request/Response Models
class ScrapeRequest(BaseModel):
    url: str
    include_links: bool = True
    format_markdown: bool = True

class SearchRequest(BaseModel):
    query: str
    max_results: int = 10

# Proxy Endpoint
@router.get("/proxy")
async def proxy_page(url: str = Query(..., description="The URL to proxy")):
    """
    Proxy a web page to avoid CORS issues

    Args:
        url: The URL to fetch and proxy

    Returns:
        HTML content with rewritten URLs
    """
    try:
        html_content, error, headers = await browser_proxy_service.fetch_page(url)

        if error:
            raise HTTPException(status_code=400, detail=error)

        # Return HTML with safe headers
        return HTMLResponse(
            content=html_content,
            headers={
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "public, max-age=3600",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in proxy endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# Scrape Endpoint
@router.post("/scrape")
async def scrape_page(request: ScrapeRequest):
    """
    Scrape a web page and extract its content

    Args:
        request: ScrapeRequest containing URL and options

    Returns:
        Scraped content with metadata
    """
    try:
        result = await web_scraper_service.scrape_url(
            url=request.url,
            include_links=request.include_links,
            format_markdown=request.format_markdown,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to scrape page")
            )

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in scrape endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# Search Endpoint
@router.post("/search")
async def search_web(request: SearchRequest):
    """
    Perform a web search using DuckDuckGo

    Args:
        request: SearchRequest containing query and options

    Returns:
        Search results
    """
    try:
        result = await search_service.search(
            query=request.query,
            max_results=request.max_results,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Search failed")
            )

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in search endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# Search News Endpoint
@router.post("/search/news")
async def search_news(request: SearchRequest):
    """
    Search for news articles

    Args:
        request: SearchRequest containing query and options

    Returns:
        News search results
    """
    try:
        result = await search_service.search_news(
            query=request.query,
            max_results=request.max_results,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "News search failed")
            )

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in news search endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# Health Check
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "browser"}
