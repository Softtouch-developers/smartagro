import apiClient from '../api-client';
import type { Conversation, Message, PaginatedResponse } from '../types';

export interface SendMessageData {
  receiver_id: number;
  text?: string;
  image_url?: string;
  voice_note_url?: string;
  related_product_id?: number;
}

export interface CreateConversationData {
  other_user_id: number;
  product_id?: number;
}

export const chatService = {
  async createConversation(data: CreateConversationData): Promise<Conversation> {
    // Backend uses query params, not body
    const params = new URLSearchParams();
    params.append('other_user_id', String(data.other_user_id));
    if (data.product_id) {
      params.append('product_id', String(data.product_id));
    }
    return apiClient.post<Conversation>(`/chat/conversations?${params.toString()}`, {});
  },

  async getConversations(page = 1, pageSize = 20): Promise<PaginatedResponse<Conversation>> {
    // Backend returns List[ConversationResponse], not paginated
    const conversations = await apiClient.get<Conversation[]>(
      `/chat/conversations?limit=${pageSize}`
    );

    // Wrap in paginated response format for frontend compatibility
    return {
      items: conversations || [],
      total: conversations?.length || 0,
      page: 1,
      page_size: pageSize,
      pages: 1,
    };
  },

  async getMessages(
    conversationId: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<Message>> {
    // Backend expects conversation_id format: buyer_{id}_seller_{id}
    // The conversationId passed here should already be in that format
    const messages = await apiClient.get<Message[]>(
      `/chat/conversations/${conversationId}/messages?limit=${pageSize}&skip=${(page - 1) * pageSize}`
    );

    // Wrap in paginated response format for frontend compatibility
    return {
      items: messages || [],
      total: messages?.length || 0,
      page: page,
      page_size: pageSize,
      pages: 1,
    };
  },

  async sendMessage(data: SendMessageData): Promise<Message> {
    return apiClient.post<Message>('/chat/messages', data);
  },

  async getUnreadCount(): Promise<{ unread_count: number }> {
    return apiClient.get<{ unread_count: number }>('/chat/unread-count');
  },

  async uploadVoiceNote(file: File): Promise<{ success: boolean; voice_note_url: string; message: string }> {
    const response = await apiClient.uploadFile('/chat/upload/voice', file, 'voice');
    return {
      success: response.success,
      voice_note_url: response.file_url,
      message: response.message
    };
  },

  async uploadImage(file: File): Promise<{ file_url: string; message: string }> {
    return apiClient.uploadFile('/storage/upload/image', file, 'image');
  },

  // Helper to format conversation ID
  formatConversationId(buyerId: number, sellerId: number): string {
    return `buyer_${buyerId}_seller_${sellerId}`;
  },

  // Helper to parse conversation ID
  parseConversationId(conversationId: string): { buyerId: number; sellerId: number } | null {
    const match = conversationId.match(/^buyer_(\d+)_seller_(\d+)$/);
    if (match) {
      return {
        buyerId: parseInt(match[1]),
        sellerId: parseInt(match[2])
      };
    }
    return null;
  }
};
