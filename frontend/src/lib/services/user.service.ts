import apiClient from '../api-client';
import type { User } from '../types';

export interface TransactionStatus {
  has_active_orders: boolean;
  has_pending_escrow: boolean;
  active_order_count: number;
  pending_escrow_count: number;
  can_delete_account: boolean;
  message?: string;
}

export const userService = {
  async getMe(): Promise<User> {
    const user = await apiClient.get<User>('/users/me');
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  async getUser(userId: number): Promise<User> {
    return apiClient.get<User>(`/users/${userId}`);
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const user = await apiClient.patch<User>('/users/me', data);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  async getTransactionStatus(): Promise<TransactionStatus> {
    return apiClient.get<TransactionStatus>('/users/me/transactions/status');
  },

  async deleteAccount(): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>('/users/me');
    apiClient.clearTokens();
    return response;
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
};

