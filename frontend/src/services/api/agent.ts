import apiClient from './client';
import { API_BASE_URL, STORAGE_KEYS } from '@/utils/constants';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: AgentAttachment[];
}

export interface AgentAttachment {
  type: 'image' | 'audio' | 'video' | 'document';
  url: string;
  filename?: string;
}

export interface AgentSession {
  session_id: string;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  language?: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  sources?: string[];
}

export interface KnowledgeSearchResult {
  id: string;
  content: string;
  source: string;
  relevance_score: number;
}

export const agentApi = {
  /**
   * Send a chat message (non-streaming)
   */
  chat: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>('/api/v1/agent/chat', request);
    return response.data;
  },

  /**
   * Send a chat message with streaming response
   * Returns an EventSource for SSE streaming
   */
  chatStream: (request: ChatRequest): EventSource => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const params = new URLSearchParams({
      message: request.message,
      ...(request.session_id && { session_id: request.session_id }),
      ...(request.language && { language: request.language }),
    });

    // Create EventSource with auth token in URL (SSE doesn't support headers)
    const url = `${API_BASE_URL}/api/v1/agent/chat/stream?${params.toString()}&token=${token}`;
    return new EventSource(url);
  },

  /**
   * Upload file and chat with multimodal support
   */
  chatWithUpload: async (
    file: File,
    message: string,
    sessionId?: string,
    language?: string
  ): Promise<ChatResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message', message);
    if (sessionId) formData.append('session_id', sessionId);
    if (language) formData.append('language', language);

    const response = await apiClient.post<ChatResponse>('/api/v1/agent/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get all chat sessions for the current user
   */
  getSessions: async (): Promise<AgentSession[]> => {
    const response = await apiClient.get<AgentSession[]>('/api/v1/agent/sessions');
    return response.data;
  },

  /**
   * Get a specific session with its messages
   */
  getSession: async (sessionId: string): Promise<{
    session: AgentSession;
    messages: AgentMessage[];
  }> => {
    const response = await apiClient.get(`/api/v1/agent/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Delete a chat session
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/agent/sessions/${sessionId}`);
  },

  /**
   * Search the farming knowledge base
   */
  searchKnowledge: async (query: string, limit?: number): Promise<KnowledgeSearchResult[]> => {
    const response = await apiClient.get<KnowledgeSearchResult[]>('/api/v1/agent/knowledge/search', {
      params: { query, limit },
    });
    return response.data;
  },

  /**
   * Get suggested questions/prompts
   */
  getSuggestions: async (): Promise<string[]> => {
    // Return static suggestions since backend might not have this endpoint
    return [
      'What crops grow best in the dry season?',
      'How do I prevent tomato blight?',
      'What fertilizer should I use for maize?',
      'How to improve soil fertility naturally?',
      'Best practices for storing harvested cassava?',
      'How to identify pest infestations early?',
    ];
  },
};
