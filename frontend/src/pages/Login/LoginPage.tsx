import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './LoginPage.module.css'

type Mode = 'admin' | 'client'

export function LoginPage() {
  const { loginAdmin, loginClient } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (mode === 'admin') {
        await loginAdmin(email, password)
        navigate('/dashboard', { replace: true })
      } else {
        const principal = await loginClient(email, password)
        // Cliente no 1º acesso é levado à troca de senha obrigatória
        const dest =
          principal.kind === 'client' && principal.mustChangePassword
            ? '/client/change-password'
            : '/client/projects'
        navigate(dest, { replace: true })
      }
    } catch {
      setError('Email ou senha inválidos.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoMark}>FT</div>
          <h1 className={styles.title}>FreelaTracker</h1>
          <p className={styles.subtitle}>Acesse sua conta</p>
        </div>

        <div className={styles.toggle} role="tablist">
          <button
            type="button"
            className={`${styles.toggleBtn} ${mode === 'admin' ? styles.toggleBtnActive : ''}`}
            onClick={() => setMode('admin')}
          >
            Sou admin
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${mode === 'client' ? styles.toggleBtnActive : ''}`}
            onClick={() => setMode('client')}
          >
            Sou cliente
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••"
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
