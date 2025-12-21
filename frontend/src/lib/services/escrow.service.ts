import apiClient from '../api-client';
import type { EscrowTransaction } from '../types';

export interface InitializeEscrowData {
  order_id: string;
  amount: number;
  callback_url?: string;
}

export const escrowService = {
  async initialize(data: InitializeEscrowData): Promise<EscrowTransaction> {
    return apiClient.post<EscrowTransaction>('/escrow/initialize', data);
  },

  async getEscrow(escrowId: string): Promise<EscrowTransaction> {
    return apiClient.get<EscrowTransaction>(`/escrow/${escrowId}`);
  },

  async verifyPayment(reference: string): Promise<EscrowTransaction> {
    return apiClient.get<EscrowTransaction>(`/escrow/verify/${reference}`);
  },
};
