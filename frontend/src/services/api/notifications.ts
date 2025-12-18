import apiClient from './client';
import type { MessageResponse } from '@/types';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  sms_sent: boolean;
  related_order_id: number | null;
  related_product_id: number | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export const notificationsApi = {
  /**
   * Get user notifications
   */
  getNotifications: async (params?: {
    limit?: number;
    offset?: number;
    unread_only?: boolean;
  }): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>('/api/v1/notifications', { params });
    return response.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get<UnreadCountResponse>('/api/v1/notifications/unread');
    return response.data;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: number): Promise<Notification> => {
    const response = await apiClient.put<Notification>(
      `/api/v1/notifications/${notificationId}/read`
    );
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>('/api/v1/notifications/read-all');
    return response.data;
  },

  /**
   * Delete notification
   */
  deleteNotification: async (notificationId: number): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(
      `/api/v1/notifications/${notificationId}`
    );
    return response.data;
  },
};
