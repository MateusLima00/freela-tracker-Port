import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PrivateRoute } from './PrivateRoute'
import { LoginPage } from '../pages/Login/LoginPage'
import { ChangePasswordPage } from '../pages/client/ChangePassword/ChangePasswordPage'
import { DashboardPage } from '../pages/admin/Dashboard/DashboardPage'
import { ProjectsPage } from '../pages/admin/Projects/ProjectsPage'
import { ProjectDetailPage } from '../pages/admin/Projects/ProjectDetailPage'
import { ClientsPage } from '../pages/admin/Clients/ClientsPage'
import { ClientDetailPage } from '../pages/admin/Clients/ClientDetailPage'
import { ReportsPage } from '../pages/admin/Reports/ReportsPage'
import { ClientProjectsPage } from '../pages/client/Projects/ClientProjectsPage'
import { ClientProjectDetailPage } from '../pages/client/Projects/ClientProjectDetailPage'
import { NotFoundPage } from '../pages/NotFound/NotFoundPage'
import { AdminLayout } from '../components/Layout/AdminLayout'
import { ClientLayout } from '../components/Layout/ClientLayout'

function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return user.kind === 'admin'
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/client/projects" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <PrivateRoute kind="admin">
      <AdminLayout>{children}</AdminLayout>
    </PrivateRoute>
  )
}

function ClientRoute({ children }: { children: React.ReactNode }) {
  return (
    <PrivateRoute kind="client">
      <ClientLayout>{children}</ClientLayout>
    </PrivateRoute>
  )
}

// Guard da troca de senha: exige cliente autenticado, mas NÃO redireciona quando
// mustChangePassword está ativo (ao contrário de PrivateRoute) — é o destino dele.
function ChangePasswordRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user || user.kind !== 'client') return <Navigate to="/login" replace />
  if (!user.mustChangePassword) return <Navigate to="/client/projects" replace />
  return <ChangePasswordPage />
}

export function AppRouter() {
  return (
    // future flags: adota o comportamento do React Router v7 desde já e silencia
    // os avisos de deprecação (resolução de rota em splat + startTransition).
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/client/change-password" element={<ChangePasswordRoute />} />

        {/* ── Admin ── */}
        <Route path="/dashboard"       element={<AdminRoute><DashboardPage /></AdminRoute>} />
        <Route path="/projects"        element={<AdminRoute><ProjectsPage /></AdminRoute>} />
        <Route path="/projects/:id"    element={<AdminRoute><ProjectDetailPage /></AdminRoute>} />
        <Route path="/clients"         element={<AdminRoute><ClientsPage /></AdminRoute>} />
        <Route path="/clients/:id"     element={<AdminRoute><ClientDetailPage /></AdminRoute>} />
        <Route path="/reports"         element={<AdminRoute><ReportsPage /></AdminRoute>} />

        {/* ── Client ── */}
        <Route path="/client/projects"      element={<ClientRoute><ClientProjectsPage /></ClientRoute>} />
        <Route path="/client/projects/:id"  element={<ClientRoute><ClientProjectDetailPage /></ClientRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
