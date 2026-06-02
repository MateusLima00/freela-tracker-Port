import api from '../api/axios'
import type { IPrincipal } from '../interfaces'
import type { ApiResponse } from '../types'

// O backend retorna { accessToken, user } onde user é o principal (admin ou cliente)
interface AuthPayload {
  accessToken: string
  user: IPrincipal
}

export const authService = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<AuthPayload>>('/auth/login', { email, password }),

  clientLogin: (email: string, password: string) =>
    api.post<ApiResponse<AuthPayload>>('/auth/client/login', { email, password }),

  register: (data: { name: string; email: string; password: string }) =>
    api.post<ApiResponse<AuthPayload>>('/auth/register', data),

  refresh: () => api.post<ApiResponse<AuthPayload>>('/auth/refresh'),

  logout: () => api.post<ApiResponse<{ message: string }>>('/auth/logout'),

  me: () => api.get<ApiResponse<IPrincipal>>('/auth/me'),

  changeClientPassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/client/change-password', {
      currentPassword,
      newPassword,
    }),
}
