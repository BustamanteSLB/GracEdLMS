import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'userToken';
const LEGACY_USER_DATA_KEY = 'userData';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Auth tokens: SecureStore on iOS/Android; sessionStorage (fallback AsyncStorage) on web.
 * Non-sensitive prefs like dark mode stay in AsyncStorage via DarkModeContext.
 */
export async function getToken(): Promise<string | null> {
  if (isNative) {
    const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secureToken) return secureToken;

    // One-time migration from older AsyncStorage-based auth
    const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (legacyToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(LEGACY_USER_DATA_KEY);
      return legacyToken;
    }
    return null;
  }

  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(TOKEN_KEY);
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (isNative) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  if (isNative) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } else if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }

  // Clear any leftover auth keys from AsyncStorage (legacy or web)
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(LEGACY_USER_DATA_KEY);
}
