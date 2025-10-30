"""Chat router for handling LLM conversations."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Literal
from loguru import logger
import json

from app.utils.llm_client import llm_manager


router = APIRouter(prefix="/api/chat", tags=["chat"])


class Message(BaseModel):
    """Chat message model."""
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    """Chat request payload."""
    messages: List[Message]
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    stream: bool = True


class ChatResponse(BaseModel):
    """Chat response payload."""
    message: Message
    model: str
    finish_reason: str


@router.post("/completions")
async def chat_completions(request: ChatRequest):
    """
    Handle chat completion requests with streaming support.

    Args:
        request: Chat request with messages and parameters

    Returns:
        Streaming response with SSE events or complete response
    """
    try:
        # Get LLM client
        client = llm_manager.get_async_client()

        # Determine model
        model = request.model or llm_manager.get_default_model()

        # Check if this is a reasoning model (GPT-5, o1, o3)
        is_reasoning_model = model.startswith('gpt-5') or model.startswith('o1') or model.startswith('o3')

        # Prepare base parameters
        params = {
            'model': model,
            'messages': [msg.dict() for msg in request.messages],
            'stream': request.stream
        }

        # GPT-5 and reasoning models only support temperature=1 (default)
        # So we omit the parameter to use the default
        if not is_reasoning_model:
            params['temperature'] = request.temperature or llm_manager.config.temperature

        # GPT-5 models use max_completion_tokens instead of max_tokens
        max_tokens_value = request.max_tokens or llm_manager.config.max_tokens
        if is_reasoning_model:
            params['max_completion_tokens'] = max_tokens_value
        else:
            params['max_tokens'] = max_tokens_value

        logger.info(f"Chat request: model={params['model']}, messages={len(request.messages)}, stream={request.stream}")

        if request.stream:
            # Streaming response
            return StreamingResponse(
                stream_chat_response(client, params),
                media_type="text/event-stream"
            )
        else:
            # Non-streaming response
            response = await client.chat.completions.create(**params)

            return ChatResponse(
                message=Message(
                    role="assistant",
                    content=response.choices[0].message.content
                ),
                model=response.model,
                finish_reason=response.choices[0].finish_reason
            )

    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def stream_chat_response(client, params):
    """
    Stream chat response using Server-Sent Events (SSE).

    Args:
        client: OpenAI async client
        params: Request parameters

    Yields:
        SSE formatted chunks
    """
    try:
        stream = await client.chat.completions.create(**params)

        async for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content

                # Format as SSE event
                data = {
                    "content": content,
                    "finish_reason": chunk.choices[0].finish_reason
                }

                yield f"data: {json.dumps(data)}\n\n"

        # Send done signal
        yield f"data: {json.dumps({'done': True})}\n\n"

    except Exception as e:
        logger.error(f"Stream error: {e}")
        error_data = {"error": str(e)}
        yield f"data: {json.dumps(error_data)}\n\n"


@router.get("/models")
async def list_models():
    """
    List available models.

    Returns:
        List of available models
    """
    return {
        "models": [llm_manager.get_default_model()],
        "default_model": llm_manager.get_default_model()
    }


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
        Health status
    """
    return {
        "status": "healthy",
        "environment": llm_manager.config.env,
        "llm_provider": llm_manager.config.llm_provider
    }
