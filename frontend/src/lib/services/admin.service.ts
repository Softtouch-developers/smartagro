import apiClient from '../api-client';
import type { User, Order, PaginatedResponse } from '../types';

export interface DashboardStats {
  total_users: number;
  total_farmers: number;
  total_buyers: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  active_disputes: number;
  pending_verifications: number;
  recent_signups: number;
  active_users_30d: number;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin?: User;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  order?: Order;
  raised_by_id: string;
  raised_by?: User;
  against_id: string;
  against?: User;
  reason: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  resolved_by_id?: string;
  resolved_by?: User;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface SystemConfig {
  key: string;
  value: any;
  description?: string;
  updated_at: string;
  updated_by?: string;
}

export interface UserFilters {
  role?: string;
  is_verified?: boolean;
  is_suspended?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface DisputeFilters {
  status?: string;
  order_id?: string;
  page?: number;
  page_size?: number;
}

export interface AuditLogFilters {
  admin_id?: string;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export const adminService = {
  async getDashboard(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>('/admin/dashboard');
  },

  async getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return apiClient.get<PaginatedResponse<User>>(`/admin/users?${params.toString()}`);
  },

  async verifyUser(userId: number): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/admin/users/${userId}/verify`, {});
  },

  async suspendUser(userId: number, reason?: string): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/admin/users/${userId}/suspend`, { reason });
  },

  async unsuspendUser(userId: number): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/admin/users/${userId}/unsuspend`, {});
  },

  async getDisputes(filters: DisputeFilters = {}): Promise<PaginatedResponse<Dispute>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return apiClient.get<PaginatedResponse<Dispute>>(`/admin/disputes?${params.toString()}`);
  },

  async resolveDispute(disputeId: string, resolution: string): Promise<Dispute> {
    return apiClient.put<Dispute>(`/admin/disputes/${disputeId}/resolve`, { resolution });
  },

  async getAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return apiClient.get<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${params.toString()}`);
  },

  async getConfig(key: string): Promise<SystemConfig> {
    return apiClient.get<SystemConfig>(`/admin/config/${key}`);
  },

  async updateConfig(key: string, value: any): Promise<SystemConfig> {
    return apiClient.put<SystemConfig>(`/admin/config/${key}`, { value });
  },
};

