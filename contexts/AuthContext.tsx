// GracEdLMS/app/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { ApiResponse } from '@/app/services/apiClient'; // Ensure this path is correct
import { User, UserCreationPayload } from '@/app/types/index'; // Ensure this path is correct

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean; // New state
  login: (email: string, password: string) => Promise<void>;
  register: (userData: UserCreationPayload) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<User | null>;
  updateUserContext: (updatedUserData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Initialize isLoggingOut

  // Helper for initial load and token verification
  const fetchCurrentUserWithToken = async (currentToken: string, fallbackUser: User | null): Promise<User | null> => {
    if (isLoggingOut) return fallbackUser; // Don't fetch if logging out

    try {
      // Temporarily set header for this specific call if not relying on interceptor for initial state
      const response = await apiClient.get<ApiResponse<User>>('/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (response.data.success && response.data.data) {
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data));
        return response.data.data;
      }
      return fallbackUser;
    } catch (error) {
      console.warn('AuthContext: Silent fetch current user failed (fetchCurrentUserWithToken). Token might be invalid.', error);
      return null;
    }
  };

  useEffect(() => {
    const loadAuthData = async () => {
      setIsLoading(true);
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserString = await AsyncStorage.getItem('userData');

        if (storedToken) {
          const storedUser = storedUserString ? JSON.parse(storedUserString) as User : null;
          const fetchedUser = await fetchCurrentUserWithToken(storedToken, storedUser);

          if (fetchedUser) {
            setToken(storedToken);
            setUser(fetchedUser);
          } else {
            // Token was stored but is invalid, or user data inconsistent
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            setToken(null);
            setUser(null);
            delete apiClient.defaults.headers.common['Authorization'];
          }
        }
      } catch (e) {
        console.error('AuthContext: Failed to load auth data from storage', e);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthData();
  }, []); // Runs once on mount

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post<ApiResponse<User>>('/auth/login', { email, password });
      if (response.data.success && response.data.token && response.data.data) {
        const { token: newToken, data: userData } = response.data;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);
        await AsyncStorage.setItem('userToken', newToken);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
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
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(newUserData);
        await AsyncStorage.setItem('userToken', newToken);
        await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An unknown registration error occurred';
      console.error('AuthContext: Registration error:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true); // Set flag at the beginning
    setIsLoading(true); // Indicate loading state during logout process
    try {
      // Optional: Call backend logout endpoint if it performs server-side session invalidation
      // await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn("AuthContext: Error calling backend logout, proceeding with client-side cleanup.", e);
    } finally {
      delete apiClient.defaults.headers.common['Authorization']; // Important: Clear auth header from apiClient instance
      setToken(null);
      setUser(null);
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setIsLoading(false); // Reset loading state
      setIsLoggingOut(false); // Reset flag at the end
      // Navigation to login will be handled by RootLayout's effect
    }
  };

  const fetchCurrentUser = async (): Promise<User | null> => {
    if (isLoggingOut) {
      console.log("AuthContext: Logout in progress, aborting fetchCurrentUser.");
      return null;
    }
    if (!token) { // Check the token from AuthContext state
      // console.log("AuthContext: No token, cannot fetch current user.");
      return null;
    }

    try {
      // apiClient should have the token set in defaults by login or its request interceptor
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (response.data.success && response.data.data) {
        setUser(response.data.data);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data));
        return response.data.data;
      } else {
        // If API call was successful but data.success is false or no data
        console.warn("AuthContext: fetchCurrentUser was successful but API indicated failure or no data. Logging out.");
        await logout(); // Treat as an issue, logout
        return null;
      }
    } catch (error: any) {
      console.error('AuthContext: Failed to fetch current user during explicit call.', error);
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
        AsyncStorage.setItem('userData', JSON.stringify(newUser));
        return newUser;
      }
      return null;
    });
  };

  return (
    <AuthContext.Provider value={{
        user,
        token,
        isAuthenticated: !!token && !!user && !isLoggingOut, // isAuthenticated is false if loggingOut
        isLoading,
        isLoggingOut, // Expose isLoggingOut
        login,
        register,
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