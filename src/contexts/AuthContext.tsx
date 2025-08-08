import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  auth_provider: string;
  created_at: string;
  referral_link?: string;
  profile_image_url?: string;
  settings: Record<string, any>;
  role: 'mfd' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { full_name?: string; phone?: string; settings?: any }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('checkAuth - token:', token ? 'exists' : 'not found');
      
      if (token) {
        const { user: userData } = await authAPI.getProfile();
        console.log('checkAuth - user data:', userData);
        setUser(userData);
      } else {
        console.log('checkAuth - no token found');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
      console.log('checkAuth - loading set to false');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      console.log('Login response:', response);
      
      const { user: userData, session } = response;
      
      if (session?.access_token) {
        localStorage.setItem('access_token', session.access_token);
        if (session.refresh_token) {
          localStorage.setItem('refresh_token', session.refresh_token);
        }
      }
      
      setUser(userData);
      console.log('User set after login:', userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signup = async (data: { email: string; password: string; full_name: string; phone?: string }) => {
    try {
      const response = await authAPI.signup(data);
      
      console.log('Signup response:', response);
      
      // If signup includes a session, use it directly
      if (response.session?.access_token) {
        localStorage.setItem('access_token', response.session.access_token);
        if (response.session.refresh_token) {
          localStorage.setItem('refresh_token', response.session.refresh_token);
        }
        setUser(response.user);
        console.log('User set after signup:', response.user);
      } else {
        // Otherwise, log in normally
        await login(data.email, data.password);
      }
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const updateProfile = async (data: { full_name?: string; phone?: string; settings?: any }) => {
    try {
      const { user: updatedUser } = await authAPI.updateProfile(data);
      setUser(updatedUser);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
