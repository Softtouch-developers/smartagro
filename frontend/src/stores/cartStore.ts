import { create } from 'zustand';
import type { Cart } from '@/types';
import type { AddToCartRequest, CheckoutRequest, CheckoutResponse } from '@/types';
import { cartApi } from '@/services/api';
import { offlineDb } from '@/services/db';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  timeRemaining: number; // seconds until expiry

  // Actions
  loadCart: () => Promise<void>;
  addToCart: (data: AddToCartRequest) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  checkout: (data: CheckoutRequest) => Promise<CheckoutResponse>;
  setTimeRemaining: (seconds: number) => void;
  clearError: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  isLoading: false,
  error: null,
  timeRemaining: 0,

  loadCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.getCart();
      if (cart) {
        await offlineDb.cacheCart(cart);
        set({
          cart,
          timeRemaining: cart.time_remaining_seconds,
          isLoading: false,
        });
      } else {
        set({ cart: null, timeRemaining: 0, isLoading: false });
      }
    } catch (error) {
      // Try cached cart if offline
      const cachedCart = await offlineDb.getCachedCart();
      if (cachedCart) {
        set({ cart: cachedCart, isLoading: false });
      } else {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load cart',
        });
      }
    }
  },

  addToCart: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.addToCart(data);
      await offlineDb.cacheCart(cart);
      set({
        cart,
        timeRemaining: cart.time_remaining_seconds,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to add to cart',
      });
      throw error;
    }
  },

  updateItem: async (itemId, quantity) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.updateCartItem(itemId, { quantity });
      await offlineDb.cacheCart(cart);
      set({
        cart,
        timeRemaining: cart.time_remaining_seconds,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update item',
      });
      throw error;
    }
  },

  removeItem: async (itemId) => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.removeCartItem(itemId);
      await offlineDb.cacheCart(cart);
      // Reload cart to ensure state is consistent
      const updatedCart = await cartApi.getCart();
      if (updatedCart) {
        await offlineDb.cacheCart(updatedCart);
        set({
          cart: updatedCart,
          timeRemaining: updatedCart.time_remaining_seconds,
          isLoading: false,
        });
      } else {
        // If cart is empty/null after removal
        set({ cart: null, timeRemaining: 0, isLoading: false });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to remove item',
      });
      throw error;
    }
  },

  clearCart: async () => {
    set({ isLoading: true, error: null });
    try {
      await cartApi.clearCart();
      await offlineDb.clearCartCache();
      set({ cart: null, timeRemaining: 0, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to clear cart',
      });
      throw error;
    }
  },

  checkout: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartApi.checkout(data);
      await offlineDb.clearCartCache();
      set({ cart: null, timeRemaining: 0, isLoading: false });
      return response;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Checkout failed',
      });
      throw error;
    }
  },

  setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),

  clearError: () => set({ error: null }),
}));

// Helper selectors
export const selectCartItemCount = (state: CartState): number =>
  state.cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

export const selectCartTotal = (state: CartState): number =>
  state.cart?.total || 0;

export const selectCartSubtotal = (state: CartState): number =>
  state.cart?.subtotal || 0;

export const selectCartFarmer = (state: CartState) =>
  state.cart?.farmer;

export const selectIsCartExpired = (state: CartState): boolean =>
  state.timeRemaining <= 0 && state.cart !== null;
