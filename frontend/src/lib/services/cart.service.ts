import apiClient from '../api-client';
import type { Cart, CheckoutResponse } from '../types';

export interface AddToCartData {
  product_id: number;
  quantity: number;
}

export interface UpdateCartItemData {
  quantity: number;
}

export interface CheckoutData {
  delivery_method: 'DELIVERY' | 'PICKUP';
  delivery_address?: string;
  delivery_region?: string;
  delivery_district?: string;
  delivery_phone: string;
  delivery_notes?: string;
  checkout_email?: string;
}

export const cartService = {
  async getCart(): Promise<Cart> {
    return apiClient.get<Cart>('/cart');
  },

  async addItem(data: AddToCartData): Promise<{ success: boolean; message: string; cart_id?: number }> {
    return apiClient.post<{ success: boolean; message: string; cart_id?: number }>('/cart/items', data);
  },

  async updateItem(itemId: string, data: UpdateCartItemData): Promise<{ success: boolean; message: string }> {
    return apiClient.put<{ success: boolean; message: string }>(`/cart/items/${itemId}`, data);
  },

  async removeItem(itemId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/cart/items/${itemId}`);
  },

  async clearCart(): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>('/cart');
  },

  async checkout(data: CheckoutData): Promise<CheckoutResponse> {
    return apiClient.post<CheckoutResponse>('/cart/checkout', data);
  },
};
