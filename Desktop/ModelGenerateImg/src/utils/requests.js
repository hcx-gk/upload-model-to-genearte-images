import axios from 'axios';
import router from '@/router';
import { API_BASE_URL } from '@/config/env';
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearAllTokens
} from '@/utils/auth';

const api = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let pendingQueue = [];

function onRefreshed(newToken) {
  pendingQueue.forEach(cb => cb(newToken));
  pendingQueue = [];
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response) return Promise.reject(error);

    if (response.status === 401 && !config.__isRetryRequest) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearAllTokens();
        router.push({ path: '/login', query: { redirect: router.currentRoute.fullPath } });
        return Promise.reject(error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshResp = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResp.data || {};
          if (newAccessToken) setAccessToken(newAccessToken);
          if (newRefreshToken) setRefreshToken(newRefreshToken);
          onRefreshed(newAccessToken);
          isRefreshing = false;

          const retryConfig = { ...config, __isRetryRequest: true };
          retryConfig.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api.request(retryConfig);
        } catch (e) {
          isRefreshing = false;
          clearAllTokens();
          router.push({ path: '/login', query: { redirect: router.currentRoute.fullPath } });
          return Promise.reject(e);
        }
      }

      return new Promise((resolve) => {
        pendingQueue.push((newToken) => {
          const retryConfig = { ...config, __isRetryRequest: true };
          if (newToken) {
            retryConfig.headers['Authorization'] = `Bearer ${newToken}`;
          }
          resolve(api.request(retryConfig));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;