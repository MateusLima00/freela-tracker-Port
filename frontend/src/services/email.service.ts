import api from '../api/axios'
import type { IEmailLog } from '../interfaces'
import type { ApiResponse } from '../types'

export const emailService = {
  // Histórico de e-mails do projeto (admin)
  listByProject: (projectId: string) =>
    api.get<ApiResponse<IEmailLog[]>>(`/projects/${projectId}/emails`),

  // Envia e-mail manual ao cliente do projeto; devolve o histórico atualizado
  send: (projectId: string, data: { subject: string; message: string }) =>
    api.post<ApiResponse<IEmailLog[]>>(`/projects/${projectId}/send-email`, data),
}
