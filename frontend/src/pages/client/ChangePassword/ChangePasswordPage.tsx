import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { authService } from '../../../services/auth.service'
import styles from './ChangePasswordPage.module.css'

// Regras de senha espelham o backend (Zod): 8+ chars, maiúscula, número, especial
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (!/[A-Z]/.test(pw)) return 'A senha deve conter uma letra maiúscula.'
  if (!/[0-9]/.test(pw)) return 'A senha deve conter um número.'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'A senha deve conter um caractere especial.'
  return null
}

export function ChangePasswordPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const pwError = validatePassword(newPassword)
    if (pwError) return setError(pwError)
    if (newPassword !== confirm) return setError('As senhas não coincidem.')

    setIsLoading(true)
    try {
      await authService.changeClientPassword(currentPassword, newPassword)
      // O backend revoga as sessões — refaz login com a nova senha
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setError('Não foi possível alterar a senha. Verifique a senha atual.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Defina uma nova senha</h1>
          <p className={styles.subtitle}>
            Por segurança, você precisa trocar a senha temporária no primeiro acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="current">Senha atual</label>
            <input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={styles.input}
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="new">Nova senha</label>
            <input
              id="new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              placeholder="Mín. 8 caracteres, maiúscula, número e especial"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm">Confirmar nova senha</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
