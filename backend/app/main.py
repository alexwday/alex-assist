"""
Alex Assist - FastAPI Backend
Main application entry point with environment-aware configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys
import logging

from app.config import config
from app.routers import chat, browser


# Configure loguru logger
logger.remove()  # Remove default handler
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> | <level>{message}</level>",
    level="DEBUG" if config.debug else "INFO",
    colorize=True
)


# Intercept standard logging to loguru
class InterceptHandler(logging.Handler):
    """Intercept standard library logging and redirect to loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = sys._getframe(6), 6
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


# Setup intercept handler for uvicorn loggers
logging.getLogger("uvicorn").handlers = [InterceptHandler()]
logging.getLogger("uvicorn.access").handlers = [InterceptHandler()]
logging.getLogger("uvicorn.error").handlers = [InterceptHandler()]

logger.info(f"🔧 Logger configured - Level: {'DEBUG' if config.debug else 'INFO'}")


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
app.include_router(browser.router)


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
