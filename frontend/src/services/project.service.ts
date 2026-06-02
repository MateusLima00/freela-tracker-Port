import api from '../api/axios'
import type {
  IProject, IFinancialSummary, IInstallment, BillingType, InstallmentStatus,
} from '../interfaces'
import type { ProjectStatus } from '../enums'
import type { ApiResponse } from '../types'

interface CreateProjectData {
  title: string
  description?: string
  clientId?: string
  deadline?: string
}

interface UpdateProjectData {
  title?: string
  description?: string
  progress?: number
  status?: ProjectStatus
  deadline?: string | null
  estimatedHours?: number | null
  // financeiro
  billingType?: BillingType
  totalValue?: number | null
  hourlyRate?: number | null
  currency?: string
}

// Item enviado ao definir parcelas em lote
export interface InstallmentInput {
  number: number
  description?: string | null
  value: number
  dueDate?: string | null
  status?: InstallmentStatus
}

export const projectService = {
  getAll: () =>
    api.get<ApiResponse<IProject[]>>('/projects'),

  getById: (id: string) =>
    api.get<ApiResponse<IProject>>(`/projects/${id}`),

  create: (data: CreateProjectData) =>
    api.post<ApiResponse<IProject>>('/projects', data),

  update: (id: string, data: UpdateProjectData) =>
    api.put<ApiResponse<IProject>>(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/projects/${id}`),

  // ── Financeiro ──
  getFinancial: (id: string) =>
    api.get<ApiResponse<IFinancialSummary>>(`/projects/${id}/financial`),

  setInstallments: (id: string, installments: InstallmentInput[]) =>
    api.post<ApiResponse<IFinancialSummary>>(`/projects/${id}/installments`, { installments }),

  markInstallmentPaid: (installmentId: string) =>
    api.patch<ApiResponse<IInstallment>>(`/installments/${installmentId}/mark-paid`),

  deleteInstallment: (installmentId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/installments/${installmentId}`),
}
