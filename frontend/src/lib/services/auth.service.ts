import apiClient from '../api-client';
import type { User, UserMode } from '../types';

export interface SignupData {
  phone_number: string;
  full_name: string;
  password: string;
  email?: string;
  user_type: 'FARMER' | 'BUYER';
  region?: string;
  district?: string;
  town_city?: string;
  farm_name?: string;
  farm_size_acres?: number;
}

export interface LoginData {
  phone_number: string;
  password: string;
}

export interface VerifyOTPData {
  user_id: number;
  otp_code: string;
  otp_type?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

// Auth endpoints are at /auth, not /api/v1/auth
const AUTH_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) 
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:8000';

// Transform backend user response to frontend User type
function transformBackendUser(backendUser: any): User {
  // Ensure roles array is always present
  let roles = backendUser.roles || getRolesFromUserType(backendUser.user_type);
  
  // Determine default mode based on user_type
  let defaultMode: UserMode = 'buyer';
  const userType = backendUser.user_type?.toUpperCase();
  if (userType === 'FARMER') {
    defaultMode = 'farmer';
  }
  
  // current_mode from backend might be uppercase, normalize it
  let currentMode = defaultMode;
  if (backendUser.current_mode) {
    currentMode = backendUser.current_mode.toLowerCase() as UserMode;
  }
  
  return {
    id: String(backendUser.id || backendUser.user_id), // Convert number to string
    phone_number: backendUser.phone_number,
    full_name: backendUser.full_name,
    email: backendUser.email || '',
    roles: roles,
    current_mode: currentMode,
    is_verified: backendUser.is_verified || false,
    region: backendUser.region || undefined,
    district: backendUser.district || undefined,
    created_at: backendUser.created_at || new Date().toISOString(),
    updated_at: backendUser.updated_at || backendUser.created_at || new Date().toISOString(),
    user_type: backendUser.user_type,
    account_status: backendUser.account_status,
    profile_image_url: backendUser.profile_image_url,
    email_verified: backendUser.email_verified,
    phone_verified: backendUser.phone_verified,
    town_city: backendUser.town_city,
    farm_name: backendUser.farm_name,
    farm_size_acres: backendUser.farm_size_acres,
    years_farming: backendUser.years_farming,
    wallet_balance: backendUser.wallet_balance,
    last_login: backendUser.last_login,
  };
}

// Convert backend USER_TYPE enum to frontend roles array
function getRolesFromUserType(userType: string): UserRole[] {
  const roles: UserRole[] = [];
  if (userType === 'FARMER') {
    roles.push('farmer');
    roles.push('buyer'); // Farmers can also buy
  } else if (userType === 'BUYER') {
    roles.push('buyer');
  } else if (userType === 'ADMIN') {
    roles.push('admin');
  }
  return roles.length > 0 ? roles : ['buyer']; // Default to buyer if unknown
}

export const authService = {
  async signup(data: SignupData): Promise<{ user_id: number; message: string }> {
    // Build signup payload matching backend SignupRequest schema
    const signupPayload: any = {
      phone_number: data.phone_number,
      full_name: data.full_name,
      password: data.password,
      user_type: data.user_type,
    };
    
    if (data.email) {
      signupPayload.email = data.email;
    }
    
    if (data.user_type === 'FARMER') {
      if (data.region) signupPayload.region = data.region;
      if (data.district) signupPayload.district = data.district;
      if (data.town_city) signupPayload.town_city = data.town_city;
      if (data.farm_name) signupPayload.farm_name = data.farm_name;
      if (data.farm_size_acres) signupPayload.farm_size_acres = data.farm_size_acres;
    }
    
    // Use full URL for auth endpoints since they're not under /api/v1
    const url = `${AUTH_BASE_URL}/auth/signup`;
    console.log('Signup URL:', url);
    console.log('Signup payload:', signupPayload);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupPayload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: response.statusText,
        }));
        // Backend returns { detail: { code: "...", message: "..." } } or { detail: "..." }
        const errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : errorData.detail?.message || errorData.message || 'Signup failed';
        throw new Error(errorMessage);
      }
      
      return response.json();
    } catch (error) {
      console.error('Signup fetch error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to reach server at ${url}. Make sure the backend is running.`);
      }
      throw error;
    }
  },

  async verifyOTP(data: VerifyOTPData): Promise<AuthResponse> {
    const response = await fetch(`${AUTH_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      const errorMessage = typeof errorData.detail === 'string' 
        ? errorData.detail 
        : errorData.detail?.message || errorData.message || 'OTP verification failed';
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Login response:', result);
    
    // Transform the user data
    const transformedUser = transformBackendUser(result.user);
    console.log('Transformed user:', transformedUser);
    
    // Handle both response formats
    const authResponse: AuthResponse = {
      access_token: result.access_token || result.tokens?.access_token,
      refresh_token: result.refresh_token || result.tokens?.refresh_token,
      token_type: result.token_type || 'bearer',
      user: transformedUser,
    };
    
    apiClient.setTokens(authResponse.access_token, authResponse.refresh_token);
    localStorage.setItem('user', JSON.stringify(transformedUser));
    return authResponse;
  },

  async resendOTP(user_id: number, otp_type: string = 'PHONE_VERIFICATION'): Promise<{ message: string }> {
    const response = await fetch(`${AUTH_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id, otp_type }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(errorData.detail || errorData.message || 'Failed to resend OTP');
    }
    
    return response.json();
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${AUTH_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      const errorMessage = typeof errorData.detail === 'string' 
        ? errorData.detail 
        : errorData.detail?.message || errorData.message || 'Login failed';
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    // Handle both response formats
    const authResponse: AuthResponse = {
      access_token: result.access_token || result.tokens?.access_token,
      refresh_token: result.refresh_token || result.tokens?.refresh_token,
      token_type: result.token_type || 'bearer',
      user: transformBackendUser(result.user),
    };
    
    apiClient.setTokens(authResponse.access_token, authResponse.refresh_token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
    return authResponse;
  },

  async logout(): Promise<void> {
    try {
      const token = apiClient['getAccessToken']();
      await fetch(`${AUTH_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
    } finally {
      apiClient.clearTokens();
    }
  },

  async forgotPassword(emailOrPhone: string): Promise<{ message: string }> {
    const response = await fetch(`${AUTH_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: emailOrPhone }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(errorData.detail || errorData.message || 'Failed to send password reset');
    }

    return response.json();
  },

  async resetPassword(data: {
    email: string;
    otp_code: string;
    new_password: string;
  }): Promise<{ message: string }> {
    const response = await fetch(`${AUTH_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(errorData.detail || errorData.message || 'Password reset failed');
    }
    
    return response.json();
  },

  async getMe(): Promise<User> {
    const backendUser = await apiClient.get<any>('/users/me');
    const user = transformBackendUser(backendUser);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  async switchMode(mode: UserMode): Promise<User> {
    const token = apiClient['getAccessToken']();
    // target_mode is a query parameter, not body parameter
    const targetMode = mode.toUpperCase();
    const response = await fetch(`${AUTH_BASE_URL}/auth/switch-mode?target_mode=${targetMode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      const errorMessage = typeof errorData.detail === 'string'
        ? errorData.detail
        : errorData.detail?.message || errorData.message || 'Failed to switch mode';
      throw new Error(errorMessage);
    }

    // Switch-mode returns MessageResponse, so we need to fetch updated user
    try {
      const updatedUser = await this.getMe();
      return updatedUser;
    } catch (error) {
      // If getMe fails due to backend validation, manually update the mode
      const cachedUser = this.getCurrentUser();
      if (cachedUser) {
        cachedUser.current_mode = mode;
        localStorage.setItem('user', JSON.stringify(cachedUser));
        return cachedUser;
      }
      throw error;
    }
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const backendUser = await apiClient.patch<any>('/users/me', data);
    const user = transformBackendUser(backendUser);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  async deleteAccount(): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>('/users/me');
    apiClient.clearTokens();
    return response;
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};
