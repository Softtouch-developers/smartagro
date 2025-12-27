import apiClient from './client';
import type { MessageResponse, OrdersResponse } from '@/types';

export interface DashboardStats {
  user_metrics: {
    total_users: number;
    farmers: number;
    buyers: number;
    admins: number;
    verified_users: number;
    active_users: number;
    new_users_this_week: number;
    new_users_this_month: number;
  };
  product_metrics: {
    total_products: number;
    active_products: number;
    featured_products: number;
    by_category: Record<string, number>;
  };
  order_metrics: {
    total_orders: number;
    orders_today: number;
    orders_this_week: number;
    orders_this_month: number;
    average_order_value: number;
    by_status: Record<string, number>;
  };
  financial_metrics: {
    total_transaction_volume: number;
    volume_this_month: number;
    total_platform_fees: number;
    escrow_balance: number;
    pending_payouts: number;
  };
  escrow_metrics: {
    total_escrow_transactions: number;
    by_status: Record<string, number>;
    auto_release_due_soon: number;
  };
  dispute_metrics: {
    total_disputes: number;
    open_disputes: number;
    resolved_disputes: number;
    average_resolution_days: number;
  };
  engagement_metrics: {
    total_conversations: number;
    total_chat_messages: number;
    agent_conversations: number;
    avg_messages_per_conversation: number;
  };
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  user_type: string;
  is_verified: boolean;
  is_active: boolean;
  account_status: string;
  created_at: string;
}

export interface Dispute {
  id: number;
  order_id: number;
  raised_by: number;
  reason: string;
  description: string;
  status: string;
  resolution: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  action_type: string;
  target_user_id: number | null;
  target_order_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export const adminApi = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/api/v1/admin/dashboard');
    return response.data;
  },

  /**
   * List users with filtering
   */
  getUsers: async (params?: {
    user_type?: string;
    account_status?: string;
    is_verified?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>('/api/v1/admin/users', { params });
    return response.data;
  },

  /**
   * Suspend user
   */
  suspendUser: async (userId: number, reason: string): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>(
      `/api/v1/admin/users/${userId}/suspend`,
      { reason }
    );
    return response.data;
  },

  /**
   * Activate user
   */
  activateUser: async (userId: number): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>(`/api/v1/admin/users/${userId}/activate`);
    return response.data;
  },

  /**
   * Verify user
   */
  verifyUser: async (userId: number): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>(`/api/v1/admin/users/${userId}/verify`);
    return response.data;
  },

  /**
   * List disputes
   */
  getDisputes: async (status?: string): Promise<Dispute[]> => {
    const response = await apiClient.get<Dispute[]>('/api/v1/admin/disputes', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  /**
   * Get dispute details
   */
  getDispute: async (disputeId: number): Promise<Dispute> => {
    const response = await apiClient.get<Dispute>(`/api/v1/admin/disputes/${disputeId}`);
    return response.data;
  },

  /**
   * Resolve dispute
   */
  resolveDispute: async (
    disputeId: number,
    data: {
      resolution: 'REFUND' | 'RELEASE' | 'PARTIAL_REFUND';
      admin_notes: string;
      partial_refund_amount?: number;
    }
  ): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(
      `/api/v1/admin/disputes/${disputeId}/resolve`,
      data
    );
    return response.data;
  },

  /**
   * Get audit logs
   */
  getAuditLogs: async (params?: {
    action_type?: string;
    admin_id?: number;
    limit?: number;
    skip?: number;
  }): Promise<AuditLog[]> => {
    const response = await apiClient.get<AuditLog[]>('/api/v1/admin/audit-logs', { params });
    return response.data;
  },

  /**
   * List system config
   */
  getSystemConfig: async (): Promise<SystemConfig[]> => {
    const response = await apiClient.get<SystemConfig[]>('/api/v1/admin/config');
    return response.data;
  },

  /**
   * Update system config
   */
  updateSystemConfig: async (key: string, value: string): Promise<MessageResponse> => {
    const response = await apiClient.put<MessageResponse>(`/api/v1/admin/config/${key}`, { value });
    return response.data;
  },

  /**
   * Get all orders (admin view)
   */
  getOrders: async (params?: {
    status?: string;
    limit?: number;
    skip?: number;
  }): Promise<OrdersResponse> => {
    const response = await apiClient.get<OrdersResponse>('/api/v1/orders', { params });
    return response.data;
  },

  // ==================== KNOWLEDGE BASE ====================

  /**
   * Get knowledge base statistics
   */
  getKnowledgeStats: async (): Promise<KnowledgeStats> => {
    const response = await apiClient.get<KnowledgeStats>('/api/v1/agent/knowledge/stats');
    return response.data;
  },

  /**
   * List knowledge documents
   */
  getKnowledgeDocuments: async (params?: {
    document_type?: string;
    limit?: number;
  }): Promise<KnowledgeDocumentsResponse> => {
    const response = await apiClient.get<KnowledgeDocumentsResponse>(
      '/api/v1/agent/knowledge/documents',
      { params }
    );
    return response.data;
  },

  /**
   * Get a specific knowledge document
   */
  getKnowledgeDocument: async (documentId: string): Promise<KnowledgeDocument> => {
    const response = await apiClient.get<KnowledgeDocument>(
      `/api/v1/agent/knowledge/documents/${documentId}`
    );
    return response.data;
  },

  /**
   * Upload a knowledge document
   * Uses longer timeout since processing and embedding creation takes time
   */
  uploadKnowledgeDocument: async (file: File): Promise<KnowledgeUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<KnowledgeUploadResponse>(
      '/api/v1/agent/knowledge/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 200000 // 2 minute timeout for upload + processing
      }
    );
    return response.data;
  },

  /**
   * Delete a knowledge document
   */
  deleteKnowledgeDocument: async (documentId: string): Promise<MessageResponse> => {
    const response = await apiClient.delete<MessageResponse>(
      `/api/v1/agent/knowledge/documents/${documentId}`
    );
    return response.data;
  },

  /**
   * Re-index all knowledge documents
   * Uses longer timeout since indexing can take several minutes
   */
  reindexKnowledge: async (forceReindex: boolean = false): Promise<KnowledgeIndexResponse> => {
    const response = await apiClient.post<KnowledgeIndexResponse>(
      '/api/v1/agent/knowledge/index',
      { force_reindex: forceReindex },
      { timeout: 500000 } // 5 minute timeout for indexing
    );
    return response.data;
  },
};

// Knowledge Base Types
export interface KnowledgeStats {
  total_documents: number;
  total_chunks: number;
  by_document_type: Record<string, number>;
  avg_chunks_per_doc: number;
}

export interface KnowledgeDocument {
  document_id: string;
  title: string;
  document_type: string;
  topics: string[];
  crops: string[];
  regions: string[];
  chunk_count: number;
  created_at: string;
  updated_at?: string;
}

export interface KnowledgeDocumentsResponse {
  documents: KnowledgeDocument[];
  total: number;
}

export interface KnowledgeUploadResponse {
  message: string;
  filename: string;
  document_id: string;
  chunks_created: number;
  document_type: string;
  topics: string[];
  crops: string[];
}

export interface KnowledgeIndexResponse {
  message: string;
  stats: {
    documents_processed: number;
    chunks_created: number;
    errors: number;
  };
}
