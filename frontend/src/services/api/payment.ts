import apiClient from './client';
import type { MessageResponse } from '@/types';

export interface InitializePaymentRequest {
  order_id: number;
  callback_url?: string;
}

export interface InitializePaymentResponse {
  success: boolean;
  escrow_id: number;
  authorization_url: string;
  reference: string;
  access_code: string;
}

export interface EscrowDetails {
  id: number;
  order_id: number;
  buyer_id: number;
  seller_id: number;
  amount: number;
  platform_fee: number;
  seller_amount: number;
  status: 'PENDING' | 'FUNDED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  paystack_reference: string;
  funded_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  auto_release_date: string | null;
  created_at: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  status: string;
  message: string;
  escrow?: EscrowDetails;
}

export interface DisputeRequest {
  reason: string;
  description: string;
}

export interface PaymentHistoryItem {
  id: number;
  order_id: number;
  amount: number;
  status: string;
  paystack_reference: string;
  created_at: string;
  product_name?: string;
  seller_name?: string;
}

export const paymentApi = {
  /**
   * Initialize payment for an order (creates escrow and returns Paystack URL)
   */
  initializePayment: async (request: InitializePaymentRequest): Promise<InitializePaymentResponse> => {
    const response = await apiClient.post<InitializePaymentResponse>('/api/v1/escrow/initialize', request);
    return response.data;
  },

  /**
   * Get escrow details by ID
   */
  getEscrow: async (escrowId: number): Promise<EscrowDetails> => {
    const response = await apiClient.get<EscrowDetails>(`/api/v1/escrow/${escrowId}`);
    return response.data;
  },

  /**
   * Get escrow details by order ID
   */
  getEscrowByOrder: async (orderId: number): Promise<EscrowDetails> => {
    const response = await apiClient.get<EscrowDetails>(`/api/v1/escrow/order/${orderId}`);
    return response.data;
  },

  /**
   * Verify payment status (called after returning from Paystack)
   */
  verifyPayment: async (reference: string): Promise<PaymentVerificationResponse> => {
    const response = await apiClient.get<PaymentVerificationResponse>('/api/v1/escrow/verify', {
      params: { reference },
    });
    return response.data;
  },

  /**
   * Release payment to seller (buyer confirms delivery)
   */
  releasePayment: async (escrowId: number): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/api/v1/escrow/${escrowId}/release`);
    return response.data;
  },

  /**
   * Request refund (buyer)
   */
  requestRefund: async (escrowId: number, reason: string): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/api/v1/escrow/${escrowId}/refund`, {
      reason,
    });
    return response.data;
  },

  /**
   * Raise a dispute
   */
  raiseDispute: async (escrowId: number, dispute: DisputeRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(`/api/v1/escrow/${escrowId}/dispute`, dispute);
    return response.data;
  },

  /**
   * Get payment history for current user
   */
  getPaymentHistory: async (params?: {
    status?: string;
    limit?: number;
    skip?: number;
  }): Promise<PaymentHistoryItem[]> => {
    const response = await apiClient.get<PaymentHistoryItem[]>('/api/v1/escrow/history', { params });
    return response.data;
  },

  /**
   * Get payment summary statistics
   */
  getPaymentStats: async (): Promise<{
    total_spent: number;
    total_pending: number;
    total_transactions: number;
  }> => {
    const response = await apiClient.get('/api/v1/escrow/stats');
    return response.data;
  },
};
