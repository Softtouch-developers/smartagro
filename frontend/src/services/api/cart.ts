import apiClient from './client';
import type {
  AddToCartRequest,
  UpdateCartItemRequest,
  CheckoutRequest,
  CheckoutResponse,
  CartResponse,
  MessageResponse,
} from '@/types';

export const cartApi = {
  /**
   * Get current cart
   */
  getCart: async (): Promise<CartResponse | null> => {
    try {
      const response = await apiClient.get<CartResponse>('/api/v1/cart');
      return response.data;
    } catch (error: unknown) {
      // 404 means no active cart
      const axiosError = error as { response?: { status: number } };
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Add item to cart
   */
  addToCart: async (data: AddToCartRequest): Promise<CartResponse> => {
    const response = await apiClient.post<CartResponse>('/api/v1/cart/items', data);
    return response.data;
  },

  /**
   * Update cart item quantity
   */
  updateCartItem: async (itemId: number, data: UpdateCartItemRequest): Promise<CartResponse> => {
    const response = await apiClient.put<CartResponse>(`/api/v1/cart/items/${itemId}`, data);
    return response.data;
  },

  /**
   * Remove item from cart
   */
  removeCartItem: async (itemId: number): Promise<CartResponse> => {
    const response = await apiClient.delete<CartResponse>(`/api/v1/cart/items/${itemId}`);
    return response.data;
  },

  /**
   * Clear cart
   */
  clearCart: async (): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>('/api/v1/cart');
    return response.data;
  },

  /**
   * Checkout cart
   */
  checkout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
    const response = await apiClient.post<CheckoutResponse>('/api/v1/cart/checkout', data);
    return response.data;
  },
};
