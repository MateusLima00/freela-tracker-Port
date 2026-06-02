import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { IPrincipal } from '../interfaces'
import { authService } from '../services/auth.service'
import { setAccessToken } from '../api/axios'

interface AuthContextData {
  user: IPrincipal | null
  isLoading: boolean
  // Retornam o principal logado para permitir redirect imediato baseado no tipo
  loginAdmin: (email: string, password: string) => Promise<IPrincipal>
  loginClient: (email: string, password: string) => Promise<IPrincipal>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextData | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IPrincipal | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restaura a sessão ao montar: o access token vive só em memória, então usamos
  // o refresh cookie httpOnly para reobter um novo access token + principal.
  useEffect(() => {
    authService
      .refresh()
      .then((res) => {
        const { accessToken, user: principal } = res.data.data
        setAccessToken(accessToken)
        setUser(principal)
      })
      .catch(() => {
        setAccessToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function loginAdmin(email: string, password: string): Promise<IPrincipal> {
    const res = await authService.login(email, password)
    const { accessToken, user: principal } = res.data.data
    setAccessToken(accessToken)
    setUser(principal)
    return principal
  }

  async function loginClient(email: string, password: string): Promise<IPrincipal> {
    const res = await authService.clientLogin(email, password)
    const { accessToken, user: principal } = res.data.data
    setAccessToken(accessToken)
    setUser(principal)
    return principal
  }

  async function logout(): Promise<void> {
    await authService.logout().catch(() => null)
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, loginAdmin, loginClient, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
