import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — inject auth token if available
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sweetbean_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — unwrap data, handle common errors
http.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response;
    // If the backend wraps responses in { code, data, message }, unwrap here
    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code === 0 || data.code === 200) {
        return data.data;
      }
      console.warn(`[HTTP] Business error: ${data.message || 'unknown'}`);
      return Promise.reject(new Error(data.message || 'Request failed'));
    }
    return data;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        console.warn('[HTTP] Unauthorized — token may be expired.');
      }
    } else if (error.request) {
      console.warn('[HTTP] Network error — no response received.');
    }
    return Promise.reject(error);
  },
);

export default http;