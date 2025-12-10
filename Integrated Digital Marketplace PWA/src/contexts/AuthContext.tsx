import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import tokenStore from '../lib/tokenStore';

type User = {
  id: number;
  email?: string;
  phone_number?: string;
  full_name?: string;
  user_type?: string;
  is_verified?: boolean;
  // add more fields as needed
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (payload: { email?: string; phone_number?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  signup: (payload: any) => Promise<any>;
  verifyOtp: (payload: { user_id: number; otp_code: string; otp_type?: string }) => Promise<any>;
  refreshTokens: () => Promise<boolean>;
  getAccessToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      // Try initialize from stored tokens
      const access = tokenStore.getAccessToken();
      if (access) {
        try {
          const me = await api.get('/auth/me');
          setUser(me);
        } catch (e) {
          // attempt refresh
          const refreshed = await refreshTokens();
          if (refreshed) {
            try {
              const me2 = await api.get('/auth/me');
              setUser(me2);
            } catch (e) {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
      }
      setLoading(false);
    })();
  }, []);

  const getAccessToken = () => tokenStore.getAccessToken();

  const refreshTokens = async (): Promise<boolean> => {
    const refresh = tokenStore.getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh })
      });
      if (!res.ok) {
        tokenStore.clearTokens();
        setUser(null);
        return false;
      }
      const json = await res.json();
      if (json.access_token) tokenStore.setAccessToken(json.access_token);
      if (json.refresh_token) tokenStore.setRefreshToken(json.refresh_token);
      return true;
    } catch (e) {
      tokenStore.clearTokens();
      setUser(null);
      return false;
    }
  };

  const login = async (payload: { email?: string; phone_number?: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', payload);
      // expected LoginResponse { tokens: { access_token, refresh_token }, user }
      const tokens = res.tokens || res;
      if (tokens.access_token) tokenStore.setAccessToken(tokens.access_token);
      if (tokens.refresh_token) tokenStore.setRefreshToken(tokens.refresh_token);

      // fetch me
      const me = await api.get('/auth/me');
      setUser(me);
    } catch (err) {
      tokenStore.clearTokens();
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload: any) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', payload);
      // signup likely returns verification_required and user_id — do not set tokens yet
      return res;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (payload: { user_id: number; otp_code: string; otp_type?: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', payload);
      // Expect response.tokens
      if (res.tokens) {
        if (res.tokens.access_token) tokenStore.setAccessToken(res.tokens.access_token);
        if (res.tokens.refresh_token) tokenStore.setRefreshToken(res.tokens.refresh_token);
      }
      if (res.user) setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // best-effort notify backend
      try {
        await api.post('/auth/logout');
      } catch (e) {
        // ignore
      }
    } finally {
      tokenStore.clearTokens();
      setUser(null);
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    signup,
    verifyOtp,
    refreshTokens,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
