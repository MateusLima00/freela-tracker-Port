import api from '../api/axios'
import type { IDashboard } from '../interfaces'
import type { ApiResponse } from '../types'

export const statsService = {
  getDashboard: () =>
    api.get<ApiResponse<IDashboard>>('/stats/dashboard'),
}
