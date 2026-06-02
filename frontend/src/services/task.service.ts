import api from '../api/axios'
import type { ITask } from '../interfaces'
import type { TaskStatus, Priority } from '../enums'
import type { ApiResponse } from '../types'

interface CreateTaskData {
  title: string
  description?: string
  priority?: Priority
  dueDate?: string | null
  projectId: string
}

interface UpdateTaskData {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: Priority
  dueDate?: string | null
}

export const taskService = {
  getByProject: (projectId: string) =>
    api.get<ApiResponse<ITask[]>>(`/tasks/project/${projectId}`),

  create: (data: CreateTaskData) =>
    api.post<ApiResponse<ITask>>('/tasks', data),

  update: (id: string, data: UpdateTaskData) =>
    api.put<ApiResponse<ITask>>(`/tasks/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/tasks/${id}`),
}
