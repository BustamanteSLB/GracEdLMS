import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// !! REPLACE WITH YOUR ACTUAL BACKEND URL !!
// For Android emulator, if backend is on localhost: 'http://10.0.2.2:PORT'
// For iOS simulator, if backend is on localhost: 'http://localhost:PORT'
// For physical device, use your computer's local network IP: 'http://YOUR_COMPUTER_IP:PORT'
const API_BASE_URL = 'http://192.168.100.5:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add token to headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    console.log('API Client: Request Interceptor - Checking for token...');

    // For specific routes like forgot-password, ensure no Authorization header is sent.
    if (config.url?.includes('/auth/forgot-password')) {
      console.log('API Client: Ensuring no token for forgot-password route.');
      if (config.headers.Authorization) {
        delete config.headers.Authorization;
        console.log('API Client: Removed Authorization header for forgot-password.');
      }
      return config;
    }

    // Prefer token from apiClient defaults if set by AuthContext, fallback to AsyncStorage
    // This handles cases where AuthContext might not have updated AsyncStorage yet.
    if (!config.headers.Authorization) {
        const token = await AsyncStorage.getItem('userToken');
        console.log('API Client: Token from AsyncStorage:', token ? 'Token found' : 'No token found');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('API Client: Authorization header set.');
        } else {
          console.log('API Client: No token found in AsyncStorage, Authorization header not set.');
        }
    } else {
      console.log('API Client: Authorization header already exists.');
    }
    console.log('API Client: Final request config headers:', config.headers);
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Log observed 401, but let the calling function (e.g., in AuthContext) handle the logout logic
      console.warn('API Client: Intercepted a 401 Unauthorized error.');
      console.log('API Client: 401 Error Details:', error.response);
      // No automatic AsyncStorage.removeItem here, as AuthContext.logout will handle it.
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Helper type for API responses (optional)
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  count?: number;
  total?: number;
  pagination?: {
    next?: { page: number; limit: number };
    prev?: { page: number; limit: number };
  };
}