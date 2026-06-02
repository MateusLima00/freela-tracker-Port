import api from '../api/axios'
import type { IProject, IClientPermissions } from '../interfaces'
import type { ApiResponse } from '../types'

export interface IClientWithCount {
  id: string
  firstName: string
  lastName: string
  name: string // firstName + ' ' + lastName (derivado pelo backend)
  email: string
  createdAt: string
  _count: { projects: number }
}

export interface IClientDetail {
  id: string
  firstName: string
  lastName: string
  name: string
  email: string
  notes: string | null
  permissions: IClientPermissions
  mustChangePassword: boolean
  createdAt: string
  projects: Array<Pick<IProject, 'id' | 'title' | 'status' | 'progress' | 'deadline' | 'totalTime'>>
}

interface CreateClientData {
  firstName: string
  lastName: string
  email: string
  password: string
  permissions?: Partial<IClientPermissions>
  notes?: string
  projectIds?: string[]
}

interface UpdateClientData {
  firstName?: string
  lastName?: string
  email?: string
  notes?: string
  permissions?: Partial<IClientPermissions>
}

export const adminClientService = {
  list: () =>
    api.get<ApiResponse<IClientWithCount[]>>('/admin/clients'),

  getById: (id: string) =>
    api.get<ApiResponse<IClientDetail>>(`/admin/clients/${id}`),

  create: (data: CreateClientData) =>
    api.post<ApiResponse<IClientWithCount>>('/admin/clients', data),

  update: (id: string, data: UpdateClientData) =>
    api.put<ApiResponse<IClientDetail>>(`/admin/clients/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/admin/clients/${id}`),

  linkProject: (clientId: string, projectId: string) =>
    api.post<ApiResponse<Pick<IProject, 'id' | 'title'>>>(`/admin/clients/${clientId}/projects/${projectId}`),

  unlinkProject: (clientId: string, projectId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/admin/clients/${clientId}/projects/${projectId}`),

  listUnlinkedProjects: () =>
    api.get<ApiResponse<Array<Pick<IProject, 'id' | 'title' | 'status'>>>>('/admin/clients/projects/unlinked'),
}
