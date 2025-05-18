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
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor (Optional: for global error handling like 401 redirect)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token might be invalid or expired
      console.log('API Client: Unauthorized access (401). Clearing token and redirecting to login.');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      // TODO: Implement navigation to login screen.
      // This is tricky to do directly here. Usually handled by AuthContext or root navigator.
      // For now, we'll just reject and let the calling component handle it.
      // Example: import { router } from 'expo-router'; router.replace('/(auth)/signin');
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
