import api from '../api/axios'
import type { IDelivery } from '../interfaces'
import type { ApiResponse } from '../types'

// Monta o FormData de upload: campos de texto + N imagens no campo "images".
function buildFormData(fields: Record<string, string | undefined>, images: File[]): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value)
  }
  images.forEach((file) => form.append('images', file))
  return form
}

export const deliveryService = {
  // ── Admin ──
  listByProject: (projectId: string) =>
    api.get<ApiResponse<IDelivery[]>>(`/projects/${projectId}/deliveries`),

  create: (projectId: string, data: { title: string; description?: string }, images: File[]) =>
    api.post<ApiResponse<IDelivery>>(
      `/projects/${projectId}/deliveries`,
      buildFormData(data, images),
    ),

  addVersion: (deliveryId: string, images: File[]) =>
    api.post<ApiResponse<IDelivery>>(
      `/deliveries/${deliveryId}/versions`,
      buildFormData({}, images),
    ),

  unlock: (deliveryId: string) =>
    api.patch<ApiResponse<IDelivery>>(`/deliveries/${deliveryId}/unlock`),

  delete: (deliveryId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/deliveries/${deliveryId}`),

  // ── Cliente ──
  listForClient: (projectId: string) =>
    api.get<ApiResponse<IDelivery[]>>(`/client/projects/${projectId}/deliveries`),

  approve: (deliveryId: string) =>
    api.patch<ApiResponse<IDelivery>>(`/client/deliveries/${deliveryId}/approve`),

  requestChanges: (deliveryId: string, feedback: string) =>
    api.patch<ApiResponse<IDelivery>>(`/client/deliveries/${deliveryId}/request-changes`, { feedback }),
}
