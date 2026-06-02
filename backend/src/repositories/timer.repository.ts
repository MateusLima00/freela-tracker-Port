import prisma from '../config/database';

export const timerRepository = {
  findActiveByUser: (userId: string) =>
    prisma.timerSession.findFirst({ where: { userId, isActive: true } }),

  findById: (id: string) =>
    prisma.timerSession.findUnique({ where: { id } }),

  findByProject: (projectId: string) =>
    prisma.timerSession.findMany({
      where: { projectId },
      orderBy: { startTime: 'desc' },
    }),

  // Sessões concluídas de um projeto dentro de um intervalo [from, to] — base do
  // relatório de horas (Fase 9). Apenas sessões paradas (com duração registrada).
  findByProjectInRange: (projectId: string, from: Date, to: Date) =>
    prisma.timerSession.findMany({
      where: {
        projectId,
        isActive: false,
        duration: { not: null },
        startTime: { gte: from, lte: to },
      },
      orderBy: { startTime: 'asc' },
    }),

  create: (data: { projectId: string; userId: string; startTime: Date; note?: string }) =>
    prisma.timerSession.create({
      data: {
        ...data,
        isActive: true,
        isPaused: false,
        accumulatedSeconds: 0,
        lastResumeAt: data.startTime, // segmento ativo começa no start
      },
    }),

  // Pausa: congela o tempo acumulado e zera o marcador do segmento corrente
  pause: (id: string, accumulatedSeconds: number) =>
    prisma.timerSession.update({
      where: { id },
      data: { accumulatedSeconds, isPaused: true, lastResumeAt: null },
    }),

  // Retoma: inicia um novo segmento ativo agora
  resume: (id: string, lastResumeAt: Date) =>
    prisma.timerSession.update({
      where: { id },
      data: { isPaused: false, lastResumeAt },
    }),

  stop: (id: string, endTime: Date, duration: number, note: string) =>
    prisma.timerSession.update({
      where: { id },
      data: { endTime, duration, note, isActive: false, isPaused: false, lastResumeAt: null },
    }),
};
