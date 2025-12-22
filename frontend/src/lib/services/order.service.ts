import apiClient from '../api-client';
import type { Order, TrackingEvent, PaginatedResponse } from '../types';

export interface OrderFilters {
  status?: string;
  page?: number;
  page_size?: number;
}

export interface ShipOrderData {
  tracking_number: string;
}

export const orderService = {
  async getOrders(filters: OrderFilters = {}): Promise<{ orders: Order[]; total: number; page: number; page_size: number; total_pages: number }> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));
    
    return apiClient.get<{ orders: Order[]; total: number; page: number; page_size: number; total_pages: number }>(`/orders?${params.toString()}`);
  },

  async getOrder(id: string): Promise<Order> {
    return apiClient.get<Order>(`/orders/${id}`);
  },

  async acceptOrder(id: string): Promise<Order> {
    return apiClient.post<Order>(`/orders/${id}/accept`, {});
  },

  async rejectOrder(id: string, reason?: string): Promise<Order> {
    return apiClient.post<Order>(`/orders/${id}/reject`, { reason });
  },

  async shipOrder(id: string, data: ShipOrderData): Promise<Order> {
    return apiClient.put<Order>(`/orders/${id}/ship`, data);
  },

  async deliverOrder(id: string): Promise<Order> {
    return apiClient.put<Order>(`/orders/${id}/deliver`, {});
  },

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    return apiClient.post<Order>(`/orders/${id}/cancel`, { reason });
  },

  async getTracking(id: string): Promise<TrackingEvent[]> {
    return apiClient.get<TrackingEvent[]>(`/orders/${id}/tracking`);
  },
};
