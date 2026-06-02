import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './ClientLayout.module.css'

export function ClientLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>FT</span>
          <span className={styles.logoText}>FreelaTracker</span>
        </div>

        <nav className={styles.nav}>
          <NavLink
            to="/client/projects"
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            Meus Projetos
          </NavLink>
        </nav>

        <div className={styles.headerRight}>
          <span className={styles.userName}>{user?.name}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
