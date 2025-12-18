import apiClient from './client';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: number;
  receiver_id: number;
  sender_type: 'BUYER' | 'FARMER';
  text: string | null;
  image_url: string | null;
  voice_note_url: string | null;
  is_read_by_buyer: boolean;
  is_read_by_seller: boolean;
  related_product_id: number | null;
  created_at: string;
}

export interface Conversation {
  conversation_id: string;
  buyer_id: number;
  seller_id: number;
  buyer_name?: string;
  seller_name?: string;
  product_id?: number;
  product_name?: string;
  last_message?: ChatMessage;
  unread_count: number;
  updated_at: string;
}

export interface SendMessageRequest {
  receiver_id: number;
  text?: string;
  image_url?: string;
  voice_note_url?: string;
  related_product_id?: number;
}

export const chatApi = {
  /**
   * Get all conversations for current user
   */
  getConversations: async (limit = 50): Promise<Conversation[]> => {
    const response = await apiClient.get<Conversation[]>('/api/v1/chat/conversations', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Create or get existing conversation
   */
  createConversation: async (
    otherUserId: number,
    productId?: number
  ): Promise<Conversation> => {
    const response = await apiClient.post<Conversation>('/api/v1/chat/conversations', null, {
      params: {
        other_user_id: otherUserId,
        product_id: productId,
      },
    });
    return response.data;
  },

  /**
   * Get messages for a conversation
   */
  getMessages: async (
    conversationId: string,
    params?: { limit?: number; skip?: number }
  ): Promise<ChatMessage[]> => {
    const response = await apiClient.get<ChatMessage[]>(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      { params }
    );
    return response.data;
  },

  /**
   * Send a message
   */
  sendMessage: async (data: SendMessageRequest): Promise<ChatMessage> => {
    const response = await apiClient.post<ChatMessage>('/api/v1/chat/messages', data);
    return response.data;
  },

  /**
   * Get unread messages count
   */
  getUnreadCount: async (): Promise<{ unread_count: number }> => {
    const response = await apiClient.get<{ unread_count: number }>('/api/v1/chat/unread-count');
    return response.data;
  },

  /**
   * Upload voice note
   */
  uploadVoiceNote: async (file: File): Promise<{ voice_note_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ success: boolean; voice_note_url: string }>(
      '/api/v1/chat/upload/voice',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return { voice_note_url: response.data.voice_note_url };
  },

  /**
   * Upload chat image
   */
  uploadImage: async (file: File): Promise<{ image_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ success: boolean; voice_note_url: string }>(
      '/api/v1/chat/upload/image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    // Backend reuses UploadVoiceNoteResponse, so we map voice_note_url to image_url
    return { image_url: response.data.voice_note_url };
  },
};
