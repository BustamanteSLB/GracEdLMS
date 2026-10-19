// GracEdLMS/app/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';
import apiClient, { ApiResponse } from '@/app/services/apiClient';
import { User, UserCreationPayload } from '@/app/types/index';
import { getToken, setToken as persistToken, removeToken } from '@/app/utils/tokenStorage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (userData: UserCreationPayload) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<User | null>;
  updateUserContext: (updatedUserData: Partial<User>) => void;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to check if platform is mobile
const isMobilePlatform = () => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Helper for initial load and token verification
  const fetchCurrentUserWithToken = async (currentToken: string): Promise<User | null> => {
    if (isLoggingOut) return null;

    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (response.data.success && response.data.data) {
        const userData = response.data.data;

        // Check if user is admin on mobile platform
        if (isMobilePlatform() && userData.role === 'Admin') {
          console.warn('AuthContext: Admin access blocked on mobile platform');
          return null;
        }

        return userData;
      }
      return null;
    } catch (error) {
      console.warn('AuthContext: Silent fetch current user failed (fetchCurrentUserWithToken). Token might be invalid.', error);
      return null;
    }
  };

  useEffect(() => {
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const storedToken = await getToken();

        if (storedToken) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const fetchedUser = await fetchCurrentUserWithToken(storedToken);

          if (fetchedUser) {
            // Check if stored user is admin on mobile
            if (isMobilePlatform() && fetchedUser.role === 'Admin') {
              console.warn('AuthContext: Admin account detected on mobile, clearing auth data');
              await removeToken();
              setToken(null);
              setUser(null);
              delete apiClient.defaults.headers.common['Authorization'];
            } else {
              setToken(storedToken);
              setUser(fetchedUser);
            }
          } else {
            await removeToken();
            setToken(null);
            setUser(null);
            delete apiClient.defaults.headers.common['Authorization'];
          }
        }
      } catch (e) {
        await removeToken();
        setToken(null);
        setUser(null);
        delete apiClient.defaults.headers.common['Authorization'];
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthData();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const response = await apiClient.post<ApiResponse<User>>('/auth/login', { identifier, password });
      if (response.data.success && response.data.token && response.data.data) {
        const { token: newToken, data: userData } = response.data;

        // Block admin login on mobile platforms
        if (isMobilePlatform() && userData.role === 'Admin') {
          throw new Error('Admin access is not available on mobile devices. Please use a web browser to access the admin panel.');
        }

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);
        await persistToken(newToken);
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unknown login error occurred';
      console.log('AuthContext: Login error:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  const register = async (userData: UserCreationPayload) => {
    try {
      const response = await apiClient.post<ApiResponse<User>>('/auth/register', userData);
      if (response.data.success && response.data.token && response.data.data) {
        const { token: newToken, data: newUserData } = response.data;

        // Block admin registration on mobile platforms
        if (isMobilePlatform() && newUserData.role === 'Admin') {
          throw new Error('Admin registration is not available on mobile devices.');
        }

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(newUserData);
        await persistToken(newToken);
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unknown registration error occurred';
      console.log('AuthContext: Registration error:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    setIsLoading(true);
    try {
      // Optional: Call backend logout endpoint
    } catch (e) {
      console.warn("AuthContext: Error calling backend logout, proceeding with client-side cleanup.", e);
    } finally {
      delete apiClient.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
      await removeToken();
      setIsLoading(false);
      setIsLoggingOut(false);
    }
  };

  const fetchCurrentUser = async (): Promise<User | null> => {
    if (isLoggingOut) {
      console.log("AuthContext: Logout in progress, aborting fetchCurrentUser.");
      return null;
    }
    if (!token) {
      return null;
    }

    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (response.data.success && response.data.data) {
        const userData = response.data.data;

        // Check if user is admin on mobile platform
        if (isMobilePlatform() && userData.role === 'Admin') {
          console.warn("AuthContext: Admin user detected on mobile platform. Logging out.");
          await logout();
          return null;
        }

        setUser(userData);
        return userData;
      } else {
        console.warn("AuthContext: fetchCurrentUser was successful but API indicated failure or no data. Logging out.");
        await logout();
        return null;
      }
    } catch (error: any) {
      console.log('AuthContext: Failed to fetch current user during explicit call.', error);
      if (error.response?.status === 401) {
        console.log("AuthContext: Received 401 during fetchCurrentUser. Logging out.");
        await logout();
      }
      return null;
    }
  };

  const updateUserContext = (updatedUserData: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        const newUser = { ...prevUser, ...updatedUserData };

        // Check if update would make user admin on mobile
        if (isMobilePlatform() && newUser.role === 'Admin') {
          console.warn('AuthContext: Cannot update to admin role on mobile platform');
          return prevUser;
        }

        return newUser;
      }
      return null;
    });
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/auth/forgot-password', { email }, { headers: {} });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Forgot password request failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred during password reset request';
      console.log('AuthContext: Forgot password error:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{
        user,
        token,
        isAuthenticated: !!token && !!user && !isLoggingOut,
        isLoading,
        isLoggingOut,
        login,
        register,
        logout,
        fetchCurrentUser,
        updateUserContext,
        forgotPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
