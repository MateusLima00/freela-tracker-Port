import api from '../api/axios'
import type { IProjectReport } from '../interfaces'
import type { ApiResponse } from '../types'

export const reportService = {
  // Relatório de horas de um projeto no intervalo [from, to] (datas YYYY-MM-DD).
  getProjectReport: (projectId: string, from?: string, to?: string) =>
    api.get<ApiResponse<IProjectReport>>(`/projects/${projectId}/report`, {
      params: { from, to },
    }),
}
