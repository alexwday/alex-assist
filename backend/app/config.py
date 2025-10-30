"""
Configuration management for Alex Assist.
Handles environment switching between LOCAL and RBC deployment modes.
"""

import os
from typing import Literal
from pathlib import Path
from dotenv import load_dotenv

# Load .env file with override=True to prioritize .env over system variables
# Find .env in the backend directory (parent of app/)
env_path = Path(__file__).parent.parent / '.env'

# Early logging setup for config loading (before loguru is configured)
from loguru import logger
import sys

# Configure basic logger for config module
logger.remove()
logger.add(sys.stdout, format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>", level="DEBUG")

logger.debug(f"[Config] Loading .env from: {env_path}")
logger.debug(f"[Config] .env file exists: {env_path.exists()}")
load_dotenv(dotenv_path=env_path, override=True)
logger.debug(f"[Config] After load_dotenv, ENV from os.getenv: {os.getenv('ENV', 'NOT SET')}")


class Config:
    """Application configuration with environment-aware settings."""

    def __init__(self):
        # Environment mode: 'local' or 'rbc'
        raw_env = os.getenv('ENV', 'local')
        self.env: Literal['local', 'rbc'] = raw_env.lower().strip()
        self.is_local = self.env == 'local'
        self.is_rbc = self.env == 'rbc'

        # Debug logging for environment detection
        logger.debug(f"[Config] Raw ENV value: '{raw_env}'")
        logger.debug(f"[Config] Processed ENV: '{self.env}'")
        logger.debug(f"[Config] is_local: {self.is_local}, is_rbc: {self.is_rbc}")

        # Server settings
        self.host = os.getenv('HOST', '0.0.0.0')
        self.port = int(os.getenv('PORT', '8000'))
        self.debug = os.getenv('DEBUG', 'false').lower() == 'true'

        # CORS settings
        self.cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')

        # Database
        self.database_url = os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./alex_assist.db')

        # File uploads
        self.upload_dir = os.getenv('UPLOAD_DIR', './uploads')
        self.max_upload_size_mb = int(os.getenv('MAX_UPLOAD_SIZE_MB', '10'))

        # LLM Configuration - set all attributes first with defaults
        # Local environment attributes
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.openai_base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')

        # RBC environment attributes
        self.rbc_llm_endpoint = os.getenv('RBC_LLM_ENDPOINT')
        self.oauth_token_endpoint = os.getenv('OAUTH_TOKEN_ENDPOINT')
        self.oauth_client_id = os.getenv('OAUTH_CLIENT_ID')
        self.oauth_client_secret = os.getenv('OAUTH_CLIENT_SECRET')
        self.oauth_scope = os.getenv('OAUTH_SCOPE') or None  # Treat empty string as None
        self.oauth_refresh_buffer_minutes = int(os.getenv('OAUTH_REFRESH_BUFFER_MINUTES', '5'))
        self.proxy_url = os.getenv('PROXY_URL')
        self.proxy_username = os.getenv('PROXY_USERNAME')
        self.proxy_password = os.getenv('PROXY_PASSWORD')

        # Environment-specific validation and settings
        if self.is_local:
            # Local development: Use OpenAI directly
            self.llm_provider = 'openai'
            self.default_model = os.getenv('DEFAULT_MODEL', 'gpt-4o-mini')

            if not self.openai_api_key:
                raise ValueError(
                    "OPENAI_API_KEY is required for local environment. "
                    "If you're in RBC environment, make sure ENV=rbc is set in your .env file."
                )
        else:
            # RBC environment: Use OAuth2 + custom endpoint
            self.llm_provider = 'rbc'
            self.default_model = os.getenv('DEFAULT_MODEL', 'gpt-4o')

            if not all([self.rbc_llm_endpoint, self.oauth_token_endpoint,
                       self.oauth_client_id, self.oauth_client_secret]):
                raise ValueError(
                    "RBC environment requires: RBC_LLM_ENDPOINT, OAUTH_TOKEN_ENDPOINT, "
                    "OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET"
                )

        # Model configuration
        self.max_tokens = int(os.getenv('MAX_TOKENS', '4096'))
        self.temperature = float(os.getenv('TEMPERATURE', '0.7'))

    def is_oauth_configured(self) -> bool:
        """Check if OAuth is configured (RBC environment only)."""
        if not self.is_rbc:
            return False
        return bool(
            self.oauth_token_endpoint and
            self.oauth_client_id and
            self.oauth_client_secret
        )

    def get_proxy_dict(self) -> dict | None:
        """Get proxy configuration for requests (RBC environment only)."""
        if not self.is_rbc or not self.proxy_url:
            return None

        # Ensure proxy_url has a scheme
        proxy_base = self.proxy_url
        if not proxy_base.startswith('http://') and not proxy_base.startswith('https://'):
            proxy_base = f'http://{proxy_base}'

        if self.proxy_username and self.proxy_password:
            # Parse the URL to insert auth credentials
            from urllib.parse import urlparse
            parsed = urlparse(proxy_base)
            proxy_with_auth = f'{parsed.scheme}://{self.proxy_username}:{self.proxy_password}@{parsed.netloc}'
            return {
                'http://': proxy_with_auth,
                'https://': proxy_with_auth
            }

        return {
            'http://': proxy_base,
            'https://': proxy_base
        }

    def __repr__(self) -> str:
        """String representation (hide sensitive data)."""
        return (
            f"Config(env={self.env}, "
            f"llm_provider={self.llm_provider}, "
            f"default_model={self.default_model})"
        )


# Global config instance
config = Config()
