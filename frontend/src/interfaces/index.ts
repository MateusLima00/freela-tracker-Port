import type { Role, ProjectStatus, TaskStatus, Priority, DeliveryStatus } from '../enums'

export interface IUser {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
  updatedAt: string
}

// ── Principal autenticado (admin ou cliente) ────────────────────────────────
// Forma unificada devolvida por /auth/login, /auth/client/login, /auth/refresh e /auth/me.
export interface IAdminPrincipal {
  kind: 'admin'
  id: string
  name: string
  email: string
  role: Role
}

export interface IClientPrincipal {
  kind: 'client'
  id: string
  firstName: string
  lastName: string
  name: string
  email: string
  mustChangePassword: boolean
  permissions: IClientPermissions
}

export type IPrincipal = IAdminPrincipal | IClientPrincipal

export interface IClientPermissions {
  viewProgress: boolean
  viewDeliveries: boolean
  approveDeliveries: boolean
  viewUpdates: boolean
  viewPayments: boolean
  receiveEmailOnDelivery: boolean
  receiveEmailOnUpdate: boolean
  receiveEmailOnPayment: boolean
}

export interface ITask {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface IProjectUpdate {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface ITimerSession {
  id: string
  projectId: string
  userId: string
  startTime: string
  endTime: string | null
  duration: number | null
  isActive: boolean
  note: string | null
  accumulatedSeconds: number
  isPaused: boolean
  lastResumeAt: string | null
  createdAt: string
}

export interface IProject {
  id: string
  title: string
  description: string | null
  progress: number
  status: ProjectStatus
  deadline: string | null
  totalTime: number
  estimatedHours: number | null
  clientId: string | null
  // Presente nas rotas ADMIN (findAll, findById) — ausente nas rotas CLIENT
  client?: { id: string; name: string; email: string }
  tasks: ITask[]
  updates: IProjectUpdate[]
  // Presente apenas nas rotas ADMIN — nunca exposto ao portal do cliente
  timerSessions?: ITimerSession[]
  createdAt: string
  updatedAt: string
}

// ── Financeiro ──────────────────────────────────────────────────────────────
export type BillingType = 'FIXED' | 'HOURLY' | 'INSTALLMENTS'
export type InstallmentStatus = 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE'

export interface IInstallment {
  id: string
  number: number
  description: string | null
  value: number
  dueDate: string | null
  status: InstallmentStatus
  paidAt: string | null
}

// Resumo financeiro (visão admin)
export interface IFinancialSummary {
  billingType: BillingType
  currency: string
  total: number
  totalPaid: number
  balance: number
  hours: number | null
  hourlyRate: number | null
  sumInstallments: number
  installmentsMatchTotal: boolean | null
  nextDueDate: string | null
  installments: IInstallment[]
}

// Resumo financeiro (visão cliente — status colapsado em PAID|PENDING)
export interface IClientFinancial {
  billingType: BillingType
  currency: string
  total: number
  totalPaid: number
  balance: number
  hours: number | null
  hourlyRate: number | null
  installments: Array<{
    id: string
    number: number
    description: string | null
    value: number
    dueDate: string | null
    status: 'PAID' | 'PENDING'
    paidAt: string | null
  }>
}

// ── Entregas (Fase 7) ─────────────────────────────────────────────────────────
export interface IDeliveryVersion {
  id: string
  deliveryId: string
  versionNumber: number
  images: string[]
  feedback: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface IDelivery {
  id: string
  projectId: string
  title: string
  description: string | null
  status: DeliveryStatus
  lockedAt: string | null
  versions: IDeliveryVersion[]
  createdAt: string
  updatedAt: string
}

// ── E-mail (Fase 8) ───────────────────────────────────────────────────────────
export interface IEmailLog {
  id: string
  projectId: string | null
  to: string
  subject: string
  body: string
  event: string
  status: 'SENT' | 'FAILED'
  error: string | null
  sentAt: string
}

// ── Relatório de horas (Fase 9) ─────────────────────────────────────────────────
export interface IReportDailyPoint {
  date: string // YYYY-MM-DD
  seconds: number
  hours: number
}

export interface IReportSession {
  id: string
  startTime: string
  endTime: string | null
  duration: number | null
  note: string | null
}

export interface IProjectReport {
  project: { id: string; title: string; estimatedHours: number | null }
  range: { from: string; to: string }
  daily: IReportDailyPoint[]
  sessions: IReportSession[]
  totals: {
    totalSeconds: number
    totalHours: number
    sessionCount: number
    dayCount: number
    dailyAverageHours: number
  }
  estimateComparison: {
    estimatedHours: number
    usedHours: number
    percentUsed: number
    overBudget: boolean
  } | null
}

export interface IStatCard {
  key: string
  label: string
  value: string | number
  sub: string
  delta: string
  deltaPositive: boolean
  // Presente apenas no card de horas: série de horas dos últimos 7 dias
  sparkline?: Array<{ date: string; hours: number }>
}

// Tipo de evento de atividade (escolhe o ícone no feed)
export type UpdateType =
  | 'GENERAL' | 'TIMER' | 'DELIVERY' | 'APPROVAL' | 'REJECTION' | 'PAYMENT' | 'STATUS'

export interface IActiveProjectCard {
  id: string
  title: string
  status: ProjectStatus
  progress: number
  deadline: string | null
  client: { name: string } | null
  hoursLogged: number
  estimatedHours: number | null
  overBudget: boolean
  tasksDone: number
  tasksTotal: number
}

export interface IUpcomingTask {
  id: string
  title: string
  priority: Priority
  dueDate: string | null
  projectId: string
  projectTitle: string
}

export interface IDashboardFinancialSummary {
  currency: string
  totalBilled: number
  totalReceived: number
  balance: number
  overdueCount: number
}

export interface IDashboard {
  statCards: IStatCard[]
  recentProjects: Array<{
    id: string
    title: string
    status: ProjectStatus
    progress: number
    totalTime: number
    totalTimeFormatted: string
    deadline: string | null
    client: { name: string }
  }>
  activeProjects: IActiveProjectCard[]
  upcomingTasks: IUpcomingTask[]
  financialSummary: IDashboardFinancialSummary
  tasksByStatus: Array<{ status: TaskStatus; _count: { status: number } }>
  projectsByStatus: Array<{ status: ProjectStatus; _count: { status: number } }>
  recentActivity: Array<{
    id: string
    projectId: string
    projectTitle: string
    updateTitle: string
    type: UpdateType
    createdAt: string
  }>
}
