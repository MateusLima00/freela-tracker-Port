import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

// Access token mantido apenas em memória (nunca em localStorage — imune a XSS).
// O refresh token vive em cookie httpOnly e é usado só na rota /auth/refresh.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Anexa o access token em toda requisição
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  // Em uploads (FormData) removemos o Content-Type padrão (application/json) para
  // o browser definir multipart/form-data com o boundary correto.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Garante uma única chamada de refresh concorrente
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((res) => {
        const token = res.data?.data?.accessToken as string | undefined
        setAccessToken(token ?? null)
        return token ?? null
      })
      .catch(() => {
        setAccessToken(null)
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.response || !error.config) {
      return Promise.reject(error)
    }

    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const url = original.url ?? ''

    // Não tentar refresh nas próprias rotas de auth (evita loop)
    const isAuthFlow = url.includes('/auth/refresh') || url.includes('/auth/login')

    if (error.response.status === 401 && !original._retry && !isAuthFlow) {
      original._retry = true
      const token = await refreshAccessToken()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
      // Refresh falhou → sessão encerrada
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default api
