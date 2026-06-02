import prisma from '../config/database';
import { CreateTaskDTO, UpdateTaskDTO } from '../dto/task.dto';

export const taskRepository = {
  findByProject: (projectId: string) =>
    prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string) =>
    prisma.task.findUnique({ where: { id } }),

  create: (data: CreateTaskDTO) =>
    prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        projectId: data.projectId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    }),

  update: (id: string, data: UpdateTaskDTO) =>
    prisma.task.update({
      where: { id },
      data: {
        ...data,
        // string → Date; null limpa o vencimento; undefined mantém o atual
        dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
      },
    }),

  delete: (id: string) =>
    prisma.task.delete({ where: { id } }),
};
