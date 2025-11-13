import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/config/env';

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setAccessToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

export function setRefreshToken(token) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAllTokens() {
  clearAccessToken();
  clearRefreshToken();
}

