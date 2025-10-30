"""LLM client factory with environment-aware configuration.
Switches between local OpenAI and RBC OAuth2 + custom endpoint.
"""

from typing import Optional
from openai import OpenAI, AsyncOpenAI
from loguru import logger

from app.config import config
from app.utils.oauth_manager import OAuthManager


class LLMClientManager:
    """Manages LLM client instances with environment-specific setup."""

    def __init__(self):
        self.config = config
        self.oauth_manager: Optional[OAuthManager] = None
        self._client: Optional[OpenAI] = None
        self._async_client: Optional[AsyncOpenAI] = None

        # Setup based on environment
        if self.config.is_rbc:
            self._setup_rbc_environment()
        else:
            self._setup_local_environment()

    def _setup_local_environment(self):
        """Setup for local development with OpenAI API."""
        logger.info("🏠 Setting up LOCAL environment")
        logger.info(f"   Provider: OpenAI")
        logger.info(f"   Base URL: {self.config.openai_base_url}")
        logger.info(f"   Model: {self.config.default_model}")

        self._client = OpenAI(
            api_key=self.config.openai_api_key,
            base_url=self.config.openai_base_url
        )

        self._async_client = AsyncOpenAI(
            api_key=self.config.openai_api_key,
            base_url=self.config.openai_base_url
        )

        logger.info("✓ Local OpenAI client initialized")

    def _setup_rbc_environment(self):
        """Setup for RBC environment with OAuth2 + SSL."""
        logger.info("🏢 Setting up RBC environment")
        logger.info(f"   Endpoint: {self.config.rbc_llm_endpoint}")
        logger.info(f"   Model: {self.config.default_model}")

        # Setup rbc_security for SSL certificates
        try:
            import rbc_security
            logger.info("   Configuring rbc_security SSL certificates...")
            rbc_security.enable_certs()
            logger.info("   ✓ rbc_security configured successfully")
        except ImportError:
            logger.warning("   ⚠️  rbc_security not available - install with: pip install rbc_security")
            logger.warning("   ⚠️  Continuing without SSL certificates (may fail in RBC environment)")
        except Exception as e:
            logger.error(f"   Failed to setup rbc_security: {e}")

        # Setup OAuth manager
        logger.info("   Initializing OAuth2 token manager...")
        self.oauth_manager = OAuthManager(
            token_endpoint=self.config.oauth_token_endpoint,
            client_id=self.config.oauth_client_id,
            client_secret=self.config.oauth_client_secret,
            scope=self.config.oauth_scope,
            refresh_buffer_minutes=self.config.oauth_refresh_buffer_minutes
        )

        # Get initial token to verify OAuth works
        token = self.oauth_manager.get_token()
        if not token:
            raise RuntimeError("Failed to obtain initial OAuth token")

        logger.info("   ✓ OAuth token manager initialized")

        # Create OpenAI client with OAuth token
        # Note: We'll need to refresh the client when token refreshes
        self._client = OpenAI(
            api_key=token,
            base_url=self.config.rbc_llm_endpoint
        )

        self._async_client = AsyncOpenAI(
            api_key=token,
            base_url=self.config.rbc_llm_endpoint
        )

        logger.info("✓ RBC LLM client initialized")

    def get_client(self) -> OpenAI:
        """Get synchronous OpenAI client."""
        # If using OAuth, refresh token if needed
        if self.config.is_rbc and self.oauth_manager:
            token = self.oauth_manager.get_token()
            if token != self._client.api_key:
                # Token was refreshed, update client
                self._client.api_key = token

        return self._client

    def get_async_client(self) -> AsyncOpenAI:
        """Get asynchronous OpenAI client."""
        # If using OAuth, refresh token if needed
        if self.config.is_rbc and self.oauth_manager:
            token = self.oauth_manager.get_token()
            if token != self._async_client.api_key:
                # Token was refreshed, update client
                self._async_client.api_key = token

        return self._async_client

    def get_default_model(self) -> str:
        """Get the default model for the current environment."""
        return self.config.default_model

    def get_model_params(self) -> dict:
        """Get default model parameters."""
        return {
            'model': self.config.default_model,
            'temperature': self.config.temperature,
            'max_tokens': self.config.max_tokens
        }


# Global LLM client manager instance
llm_manager = LLMClientManager()
