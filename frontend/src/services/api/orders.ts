import apiClient from './client';
import type { OrdersQuery, OrdersResponse, MessageResponse } from '@/types';
import type { Order, OrderStatus } from '@/types';

export const ordersApi = {
  /**
   * Get orders (buyer or seller view)
   */
  getOrders: async (params?: OrdersQuery): Promise<OrdersResponse> => {
    const response = await apiClient.get<OrdersResponse>('/api/v1/orders', { params });
    return response.data;
  },

  /**
   * Get single order by ID
   */
  getOrder: async (id: number): Promise<Order> => {
    const response = await apiClient.get<Order>(`/api/v1/orders/${id}`);
    return response.data;
  },

  /**
   * Get order by order number
   */
  getOrderByNumber: async (orderNumber: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/api/v1/orders/number/${orderNumber}`);
    return response.data;
  },

  /**
   * Update order status (seller)
   */
  updateOrderStatus: async (id: number, status: OrderStatus): Promise<Order> => {
    const response = await apiClient.put<Order>(`/api/v1/orders/${id}/status`, { status });
    return response.data;
  },

  /**
   * Ship order (seller)
   */
  shipOrder: async (
    id: number,
    data: { carrier?: string; tracking_number?: string }
  ): Promise<Order> => {
    const response = await apiClient.post<Order>(`/api/v1/orders/${id}/ship`, data);
    return response.data;
  },

  /**
   * Confirm delivery (buyer)
   */
  confirmDelivery: async (id: number, confirmationCode?: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/api/v1/orders/${id}/confirm-delivery`, {
      confirmation_code: confirmationCode,
    });
    return response.data;
  },

  /**
   * Cancel order
   */
  cancelOrder: async (id: number, reason?: string): Promise<Order> => {
    const response = await apiClient.post<Order>(`/api/v1/orders/${id}/cancel`, { reason });
    return response.data;
  },

  /**
   * Open dispute
   */
  openDispute: async (
    orderId: number,
    data: {
      reason: string;
      evidence_description?: string;
    }
  ): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/api/v1/orders/${orderId}/dispute`, data);
    return response.data;
  },

  /**
   * Submit review for order
   */
  submitReview: async (
    orderId: number,
    data: {
      rating: number;
      review_text?: string;
      quality_rating?: number;
      communication_rating?: number;
      delivery_rating?: number;
    }
  ): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/api/v1/orders/${orderId}/review`, data);
    return response.data;
  },
};
