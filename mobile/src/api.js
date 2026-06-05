import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const fallbackBaseUrl = Platform.select({
  android: 'http://10.0.2.2:8080',
  ios: 'http://127.0.0.1:8080',
  default: 'http://127.0.0.1:8080',
});

const API_BASE_STORAGE_KEY = 'food-manager-api-base-url';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  fallbackBaseUrl;

export async function getApiBaseUrlOverride() {
  return AsyncStorage.getItem(API_BASE_STORAGE_KEY);
}

export async function setApiBaseUrlOverride(value) {
  const normalized = String(value || '').trim().replace(/\/$/, '');
  if (!normalized) {
    await AsyncStorage.removeItem(API_BASE_STORAGE_KEY);
    return '';
  }
  await AsyncStorage.setItem(API_BASE_STORAGE_KEY, normalized);
  return normalized;
}

async function getApiCandidates() {
  const overrideBaseUrl = await getApiBaseUrlOverride();
  const configuredBaseUrl = overrideBaseUrl || API_BASE_URL;
  const isLocalConfigured = /127\.0\.0\.1|localhost|10\.0\.2\.2/.test(configuredBaseUrl);

  if (configuredBaseUrl && !isLocalConfigured) {
    return [configuredBaseUrl];
  }

  return Array.from(new Set([
    configuredBaseUrl,
    Platform.OS === 'android' ? 'http://10.0.2.2:8080' : null,
    'http://127.0.0.1:8080',
    'http://localhost:8080',
  ].filter(Boolean)));
}

export async function getToken() {
  return AsyncStorage.getItem('food-manager-token');
}

export async function readUser() {
  try {
    const user = JSON.parse((await AsyncStorage.getItem('food-manager-user')) || 'null');
    return user?.role ? user : null;
  } catch {
    return null;
  }
}

export async function saveSession(data) {
  await AsyncStorage.multiSet([
    ['food-manager-token', data.token],
    ['food-manager-user', JSON.stringify(data.user)],
  ]);
}

export async function clearSession() {
  await AsyncStorage.multiRemove(['food-manager-token', 'food-manager-user']);
}

export async function api(path, options = {}) {
  const token = await getToken();
  const apiCandidates = await getApiCandidates();
  let response;

  for (const baseUrl of apiCandidates) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
      break;
    } catch (error) {
      // Try the next development URL candidate.
    }
  }

  if (!response) {
    throw new Error(`백엔드 서버에 연결할 수 없습니다. 시도한 주소: ${apiCandidates.join(', ')}`);
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(data?.detail ? `${data.message}: ${data.detail}` : data?.message || '요청에 실패했습니다.');
  }
  return data;
}

export function apiDebugInfo() {
  return {
    configuredBaseUrl: API_BASE_URL,
    candidates: [API_BASE_URL],
  };
}

export async function readApiDebugInfo() {
  return {
    configuredBaseUrl: API_BASE_URL,
    overrideBaseUrl: await getApiBaseUrlOverride(),
    candidates: await getApiCandidates(),
  };
}

