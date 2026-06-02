import api from '../api/axios'
import type { ITimerSession } from '../interfaces'
import type { ApiResponse } from '../types'

export const timerService = {
  start: (projectId: string, note?: string) =>
    api.post<ApiResponse<ITimerSession>>('/timer/start', { projectId, note }),

  pause: (sessionId: string) =>
    api.patch<ApiResponse<ITimerSession>>(`/timer/pause/${sessionId}`),

  resume: (sessionId: string) =>
    api.patch<ApiResponse<ITimerSession>>(`/timer/resume/${sessionId}`),

  // Nota obrigatória — vira uma atualização no feed do projeto
  stop: (sessionId: string, note: string) =>
    api.patch<ApiResponse<ITimerSession>>(`/timer/stop/${sessionId}`, { note }),

  getActive: () =>
    api.get<ApiResponse<ITimerSession | null>>('/timer/active'),

  getByProject: (projectId: string) =>
    api.get<ApiResponse<ITimerSession[]>>(`/timer/project/${projectId}`),
}
