/**
 * Custom hook for chat functionality
 */

import { useState, useCallback, useRef } from 'react';
import { chatApi } from '../lib/api';
import type { Message } from '../types/chat';

export interface UseChatOptions {
  initialMessages?: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export const useChat = (options: UseChatOptions = {}) => {
  const [messages, setMessages] = useState<Message[]>(options.initialMessages || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Add user message
      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setStreamingContent('');

      try {
        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Stream the response
        let fullResponse = '';

        await chatApi.streamChat({
          messages: [...messages, userMessage],
          model: options.model,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          onChunk: (chunk) => {
            fullResponse += chunk;
            console.log('🔄 Accumulated response length:', fullResponse.length);
            setStreamingContent(fullResponse);
          },
          onDone: () => {
            // Add complete assistant message
            const assistantMessage: Message = {
              role: 'assistant',
              content: fullResponse,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingContent('');
            setIsLoading(false);
          },
          onError: (err) => {
            setError(err);
            setIsLoading(false);
            setStreamingContent('');
          },
        });
      } catch (err) {
        setError(err as Error);
        setIsLoading(false);
        setStreamingContent('');
      }
    },
    [messages, isLoading, options]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingContent('');
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setStreamingContent('');
  }, []);

  const restoreMessages = useCallback((restoredMessages: Message[]) => {
    setMessages(restoredMessages);
    setError(null);
    setStreamingContent('');
  }, []);

  return {
    messages,
    isLoading,
    error,
    streamingContent,
    sendMessage,
    stopGeneration,
    clearMessages,
    restoreMessages,
  };
};
