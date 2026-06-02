import api from '../api/axios'
import type { IProject, IProjectUpdate, IClientFinancial } from '../interfaces'
import type { ApiResponse } from '../types'

export const clientService = {
  getMyProjects: () =>
    api.get<ApiResponse<IProject[]>>('/client/projects'),

  getMyProject: (id: string) =>
    api.get<ApiResponse<IProject>>(`/client/projects/${id}`),

  getProjectUpdates: (id: string) =>
    api.get<ApiResponse<IProjectUpdate[]>>(`/client/projects/${id}/updates`),

  getFinancial: (id: string) =>
    api.get<ApiResponse<IClientFinancial>>(`/client/projects/${id}/financial`),
}
