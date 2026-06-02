import api from '../api/axios'
import type { IProjectUpdate } from '../interfaces'
import type { ApiResponse } from '../types'

interface CreateUpdateData {
  projectId: string
  title: string
  content: string
}

interface EditUpdateData {
  title?: string
  content?: string
}

export const updateService = {
  getByProject: (projectId: string) =>
    api.get<ApiResponse<IProjectUpdate[]>>(`/updates/project/${projectId}`),

  create: (data: CreateUpdateData) =>
    api.post<ApiResponse<IProjectUpdate>>('/updates', data),

  update: (id: string, data: EditUpdateData) =>
    api.put<ApiResponse<IProjectUpdate>>(`/updates/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/updates/${id}`),
}
