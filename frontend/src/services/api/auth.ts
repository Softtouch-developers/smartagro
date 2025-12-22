import apiClient from './client';
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  OTPVerifyRequest,
  RefreshTokenRequest,
  SwitchModeRequest,
  MessageResponse,
} from '@/types';
import type { User } from '@/types';

export const authApi = {
  /**
   * Login with email/phone and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', data);
    return response.data;
  },

  /**
   * Register a new user
   */
  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    const response = await apiClient.post<SignupResponse>('/api/v1/auth/signup', data);
    return response.data;
  },

  /**
   * Verify OTP code
   */
  verifyOTP: async (data: OTPVerifyRequest): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/api/v1/auth/verify-otp', data);
    return response.data;
  },

  /**
   * Resend OTP code
   */
  resendOTP: async (userId: number, otpType: string): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/api/v1/auth/resend-otp', {
      user_id: userId,
      otp_type: otpType,
    });
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (data: RefreshTokenRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/refresh', data);
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/v1/users/me');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>('/api/v1/users/me', data);
    return response.data;
  },

  /**
   * Switch between farmer and buyer mode
   */
  switchMode: async (data: SwitchModeRequest): Promise<User> => {
    const response = await apiClient.post<User>('/api/v1/users/me/switch-mode', data);
    return response.data;
  },

  /**
   * Upload profile image
   */
  uploadProfileImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>('/api/v1/users/me/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (data: { email?: string; phone_number?: string }): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/api/v1/auth/forgot-password', data);
    return response.data;
  },

  /**
   * Verify reset OTP
   */
  verifyResetOtp: async (data: { email?: string; phone_number?: string; otp_code: string }): Promise<{ success: boolean; message: string; reset_token: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string; reset_token: string }>('/api/v1/auth/verify-reset-otp', data);
    return response.data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>('/api/v1/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Delete user account
   */
  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/api/v1/users/me');
  },

  /**
   * Logout (invalidate token on server)
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout');
  },
};
