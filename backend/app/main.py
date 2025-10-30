"""
Alex Assist - FastAPI Backend
Main application entry point with environment-aware configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from app.config import config
from app.routers import chat


# Configure logger
logger.remove()  # Remove default handler
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO" if not config.debug else "DEBUG"
)


# Create FastAPI app
app = FastAPI(
    title="Alex Assist API",
    description="AI Assistant backend with environment-aware LLM configuration",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(chat.router)


@app.on_event("startup")
async def startup_event():
    """Startup event handler."""
    logger.info("")
    logger.info("=" * 80)
    logger.info("🚀 Alex Assist - AI Assistant Backend")
    logger.info("=" * 80)
    logger.info("")
    logger.info(f"Environment: {config.env.upper()}")
    logger.info(f"LLM Provider: {config.llm_provider}")
    logger.info(f"Default Model: {config.default_model}")
    logger.info(f"Host: {config.host}:{config.port}")
    logger.info(f"Debug Mode: {config.debug}")
    logger.info(f"CORS Origins: {', '.join(config.cors_origins)}")
    logger.info("")
    logger.info("=" * 80)
    logger.info("")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    logger.info("Shutting down Alex Assist backend...")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Alex Assist API",
        "version": "0.1.0",
        "environment": config.env,
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": config.env,
        "llm_provider": config.llm_provider
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=config.host,
        port=config.port,
        reload=config.debug,
        log_level="info"
    )
