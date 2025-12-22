import apiClient from '../api-client';
import type { Notification, PaginatedResponse } from '../types';

export const notificationService = {
  async getNotifications(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Notification>> {
    return apiClient.get<PaginatedResponse<Notification>>(
      `/notifications?page=${page}&page_size=${pageSize}`
    );
  },

  async getUnreadCount(): Promise<{ unread_count: number }> {
    return apiClient.get<{ unread_count: number }>('/notifications/unread');
  },

  async markAsRead(notificationId: string): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/notifications/${notificationId}/read`, {});
  },

  async markAllAsRead(): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/notifications/read-all', {});
  },
};
