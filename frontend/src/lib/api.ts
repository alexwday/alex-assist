/**
 * API client for backend communication
 */

import axios from 'axios';
import type { ChatRequest, ChatResponse, Message } from '../types/chat';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface StreamChatParams {
  messages: Message[];
  onChunk: (content: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export const chatApi = {
  /**
   * Send a chat message with streaming response
   */
  async streamChat(params: StreamChatParams) {
    const {
      messages,
      onChunk,
      onDone,
      onError,
      model,
      temperature,
      max_tokens,
    } = params;

    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
          temperature,
          max_tokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                onError(new Error(parsed.error));
                return;
              }

              if (parsed.done) {
                onDone();
                return;
              }

              if (parsed.content) {
                console.log('📨 Streaming chunk:', parsed.content);
                onChunk(parsed.content);
              }
            } catch (e) {
              // Ignore JSON parse errors
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }

      onDone();
    } catch (error) {
      onError(error as Error);
    }
  },

  /**
   * Send a chat message without streaming
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await api.post<ChatResponse>('/chat/completions', {
      ...request,
      stream: false,
    });
    return response.data;
  },

  /**
   * Get available models
   */
  async getModels() {
    const response = await api.get<{ models: string[]; default_model: string }>(
      '/chat/models'
    );
    return response.data;
  },

  /**
   * Health check
   */
  async healthCheck() {
    const response = await api.get('/chat/health');
    return response.data;
  },
};

export default api;
