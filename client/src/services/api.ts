import axios from 'axios';
import type { TrendPoint, User } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

// 请求拦截器：自动附带 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('traffic_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

export async function login(username: string, password: string) {
  const res = await api.post<{ token: string; user: User }>('/login', { username, password });
  return res.data;
}

export async function getMe() {
  const res = await api.get<{ user: User }>('/me');
  return res.data.user;
}

export async function getTrends(): Promise<TrendPoint[]> {
  const res = await api.get<{ hours: TrendPoint[] }>('/trends');
  return res.data.hours;
}

export default api;
