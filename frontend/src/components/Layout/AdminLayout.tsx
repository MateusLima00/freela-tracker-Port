import { useState, useEffect, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  IconMenu2, IconX,
  IconLayoutDashboard, IconBriefcase, IconUsers, IconChartBar, IconLogout,
} from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconLayoutDashboard size={20} /> },
  { to: '/projects',  label: 'Projetos',  icon: <IconBriefcase size={20} /> },
  { to: '/clients',   label: 'Clientes',  icon: <IconUsers size={20} /> },
  { to: '/reports',   label: 'Relatórios', icon: <IconChartBar size={20} /> },
]

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* Fecha o drawer ao navegar */
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  /* Trava o scroll do body quando drawer está aberto */
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className={styles.layout}>

      {/* ── Header mobile (hamburguer) ── */}
      <header className={styles.mobileHeader}>
        <button
          className={styles.hamburger}
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <IconMenu2 size={22} />
        </button>

        <div className={styles.mobileLogoArea}>
          <span className={styles.logoMark}>FT</span>
          <span className={styles.logoText}>FreelaTracker</span>
        </div>

        <div className={styles.mobileAvatar} title={user?.name}>
          {user?.name.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* ── Overlay do drawer (mobile) ── */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>

        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoMark}>FT</span>
          <span className={styles.logoText}>FreelaTracker</span>
          <button
            className={styles.sidebarClose}
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userText}>
              <p className={styles.userName}>{user?.name}</p>
              <p className={styles.userRole}>Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn} title="Sair">
            <IconLogout size={16} className={styles.logoutIcon} />
            <span className={styles.logoutText}>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ── */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
