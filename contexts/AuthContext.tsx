import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { ApiResponse } from '@/app/services/apiClient'; // Assuming ApiResponse type from apiClient
import { User } from '@/app/types/index'; // Define your User type

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register?: (userData: any) => Promise<void>; // Optional: if context handles registration
  fetchCurrentUser: () => Promise<User | null>;
  updateUserContext: (updatedUserData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserString = await AsyncStorage.getItem('userData');

        if (storedToken && storedUserString) {
          setToken(storedToken);
          const storedUser = JSON.parse(storedUserString) as User;
          setUser(storedUser);
          // Optionally, verify token with backend by calling fetchCurrentUser
          // await fetchCurrentUser(storedToken); // Pass token to ensure apiClient uses it
        }
      } catch (e) {
        console.error('Failed to load auth data from storage', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthData();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post<ApiResponse<User>>('/auth/login', { email, password });
      if (response.data.success && response.data.token && response.data.data) {
        const { token: newToken, data: userData } = response.data;
        setToken(newToken);
        setUser(userData);
        await AsyncStorage.setItem('userToken', newToken);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('token', newToken);
        }
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unknown login error occurred';
      console.error('Login error:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Optional: Call backend logout endpoint if it does anything (like blacklisting token)
      // await apiClient.post('/auth/logout');
    } catch (e) {
        console.warn("Error calling backend logout, proceeding with client-side logout", e);
    } finally {
        setToken(null);
        setUser(null);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('token');
        }
        setIsLoading(false);
        // Navigation to login screen will be handled by the RootLayout based on isAuthenticated
    }
  };

  const fetchCurrentUser = async (currentToken?: string): Promise<User | null> => {
    try {
      // Ensure API client has the token if passed (e.g., during initial load)
      const headers = currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
      const response = await apiClient.get<ApiResponse<User>>('/auth/me', { headers });
      if (response.data.success && response.data.data) {
        setUser(response.data.data);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data));
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch current user, possibly invalid token.', error);
      // If fetch fails, likely token is bad, so logout.
      await logout();
      return null;
    }
  };

 const updateUserContext = (updatedUserData: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        const newUser = { ...prevUser, ...updatedUserData };
        AsyncStorage.setItem('userData', JSON.stringify(newUser)); // Update storage
        return newUser;
      }
      return null;
    });
  };

  return (
    <AuthContext.Provider value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        fetchCurrentUser,
        updateUserContext
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