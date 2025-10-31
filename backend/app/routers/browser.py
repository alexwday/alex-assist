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
from loguru import logger

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

        # CRITICAL: Only send these specific headers - NO encoding headers
        # Do NOT send Content-Encoding header - its absence indicates no compression
        response_headers = {
            "Cache-Control": "public, max-age=3600",
        }

        logger.debug(f"[PROXY] Content length being sent: {len(html_content)} characters")
        logger.debug(f"[PROXY] First 100 chars: {html_content[:100]}")

        # Pass string directly to HTMLResponse - let FastAPI handle encoding
        # Use media_type parameter to set Content-Type (don't duplicate in headers dict)
        return HTMLResponse(
            content=html_content,
            headers=response_headers,
            media_type="text/html; charset=utf-8"
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

# Debug endpoint to test encoding
@router.get("/debug/encoding")
async def debug_encoding(url: str = Query(..., description="URL to test encoding")):
    """Debug endpoint to see what encoding is detected for a URL"""
    import httpx
    from app.config import config

    try:
        client_kwargs = {"timeout": 10.0, "follow_redirects": True}
        proxy_config = config.get_proxy_dict()
        if proxy_config:
            client_kwargs["proxies"] = proxy_config

        async with httpx.AsyncClient(**client_kwargs) as client:
            response = await client.get(url)

            content_type = response.headers.get("Content-Type", "")

            # Try to detect encoding
            encoding = None
            if 'charset=' in content_type.lower():
                encoding = content_type.lower().split('charset=')[-1].split(';')[0].strip()

            if not encoding:
                import re
                head_bytes = response.content[:1024]
                charset_match = re.search(rb'charset=["\']?([^"\'>\s]+)', head_bytes, re.IGNORECASE)
                if charset_match:
                    encoding = charset_match.group(1).decode('ascii')

            if not encoding:
                encoding = 'utf-8 (default)'

            return {
                "url": url,
                "content_type": content_type,
                "detected_encoding": encoding,
                "httpx_encoding": response.encoding,
                "content_length": len(response.content),
                "first_100_chars": response.content[:100].hex()
            }
    except Exception as e:
        return {"error": str(e)}

# Test endpoint - serves a simple UTF-8 HTML page
@router.get("/debug/test-utf8")
async def test_utf8():
    """Test endpoint that returns a simple UTF-8 HTML page with special characters"""
    test_html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>UTF-8 Test Page</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .test-char { font-size: 24px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>UTF-8 Encoding Test</h1>
    <p>If you see readable characters below, UTF-8 is working correctly:</p>
    <div class="test-char">English: Hello World</div>
    <div class="test-char">French: Café, résumé, naïve</div>
    <div class="test-char">German: Über, Größe, Bräu</div>
    <div class="test-char">Spanish: ¿Cómo estás? ¡Olé!</div>
    <div class="test-char">Symbols: © ® ™ € £ ¥</div>
    <div class="test-char">Chinese: 你好世界 (Hello World)</div>
    <div class="test-char">Japanese: こんにちは世界</div>
    <div class="test-char">Emoji: 🌍 🚀 ✅ ❌ 🎉</div>
</body>
</html>"""

    return HTMLResponse(
        content=test_html,
        media_type="text/html; charset=utf-8"
    )
