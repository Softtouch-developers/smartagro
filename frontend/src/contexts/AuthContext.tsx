import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../lib/services/auth.service';
import type { User, UserMode } from '../lib/types';
import type { LoginData, SignupData, VerifyOTPData } from '../lib/services/auth.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  verifyOTP: (data: VerifyOTPData) => Promise<void>;
  logout: () => Promise<void>;
  switchMode: (mode: UserMode) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const currentUser = await authService.getMe();
          setUser(currentUser);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          authService.logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginData) => {
    const response = await authService.login(data);
    setUser(response.user);
  };

  const signup = async (data: SignupData) => {
    await authService.signup(data);
    // Don't set user yet - wait for OTP verification
  };

  const verifyOTP = async (data: VerifyOTPData) => {
    const response = await authService.verifyOTP(data);
    setUser(response.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const switchMode = async (mode: UserMode) => {
    const updatedUser = await authService.switchMode(mode);
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    const updatedUser = await authService.getMe();
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        verifyOTP,
        logout,
        switchMode,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
