import apiClient from '../api-client';
import type { AgentMessage, AgentSession } from '../types';

export interface ChatRequest {
  message: string;
  session_id?: string;
  user_context?: Record<string, any>;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  sources?: Array<{
    title: string;
    content: string;
    relevance_score: number;
  }>;
}

export const agentService = {
  async chat(data: ChatRequest): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>('/agent/chat', data);
  },

  // SSE stream endpoint - returns EventSource
  createChatStream(data: ChatRequest): EventSource {
    const accessToken = localStorage.getItem('access_token');
    const baseURL = apiClient['baseURL'];

    const params = new URLSearchParams({
      message: data.message,
      ...(data.session_id && { session_id: data.session_id }),
      ...(data.user_context && { user_context: JSON.stringify(data.user_context) }),
    });

    const url = `${baseURL}/agent/chat/stream?${params.toString()}`;
    const eventSource = new EventSource(url, {
      withCredentials: false,
    });

    // Note: EventSource doesn't support custom headers, so we need to pass token in query
    // The backend should handle token in query param for SSE endpoints
    return eventSource;
  },

  async uploadFile(file: File): Promise<{ filename: string; url: string }> {
    const response = await apiClient.uploadFile('/agent/chat/upload', file, 'document');
    return {
      filename: file.name,
      url: response.file_url
    };
  },

  async getSessions(): Promise<AgentSession[]> {
    return apiClient.get<AgentSession[]>('/agent/sessions');
  },

  async deleteSession(sessionId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/agent/sessions/${sessionId}`);
  },
};
