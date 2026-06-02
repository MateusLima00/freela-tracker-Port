import prisma from '../config/database';
import { CreateProjectDTO, UpdateProjectDTO } from '../dto/project.dto';

export const projectRepository = {
  // Retorna todos os projetos com cliente e tarefas — usado pelo painel ADMIN
  findAll: () =>
    prisma.project.findMany({
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        tasks: true,
      },
      orderBy: { createdAt: 'desc' },
    }),

  // Retorna projeto completo (inclui timerSessions) — exclusivo para rotas ADMIN
  findById: (id: string) =>
    prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        tasks: { orderBy: { createdAt: 'desc' } },
        updates: { orderBy: { createdAt: 'desc' } },
        timerSessions: { orderBy: { startTime: 'desc' } },
      },
    }),

  // Versão segura para o portal do cliente: omite timerSessions (dados internos de billing)
  findByIdForClient: (id: string) =>
    prisma.project.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { createdAt: 'desc' } },
        updates: { orderBy: { createdAt: 'desc' } },
      },
    }),

  // Lista projetos do cliente autenticado — sem timerSessions, com últimos 5 updates
  findByClientId: (clientId: string) =>
    prisma.project.findMany({
      where: { clientId },
      include: {
        tasks: true,
        updates: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    }),

  create: (data: CreateProjectDTO) =>
    prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        clientId: data.clientId,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    }),

  update: (id: string, data: UpdateProjectDTO) =>
    prisma.project.update({
      where: { id },
      data: {
        ...data,
        deadline: data.deadline === undefined
          ? undefined
          : data.deadline === null
            ? null
            : new Date(data.deadline),
      },
    }),

  delete: (id: string) =>
    prisma.project.delete({ where: { id } }),

  // Incrementa totalTime atomicamente ao parar um timer
  addTime: (id: string, seconds: number) =>
    prisma.project.update({
      where: { id },
      data: { totalTime: { increment: seconds } },
    }),
};
