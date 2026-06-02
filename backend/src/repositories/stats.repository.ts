import prisma from '../config/database';

function thisMonth() {
  const now = new Date();
  return {
    gte: new Date(now.getFullYear(), now.getMonth(), 1),
    lt:  new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

function lastMonth() {
  const now = new Date();
  return {
    gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    lt:  new Date(now.getFullYear(), now.getMonth(), 1),
  };
}

export const statsRepository = {
  // ── Totais gerais ────────────────────────────────────────────────
  countProjects:       () => prisma.project.count(),
  countActiveProjects: () => prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
  countClients:        () => prisma.client.count(),
  countTasks:          () => prisma.task.count(),
  countPendingTasks:   () => prisma.task.count({ where: { status: 'TODO' } }),

  // ── Deltas mensais (novos este mês vs mês anterior) ──────────────
  countProjectsThisMonth: () => prisma.project.count({ where: { createdAt: thisMonth() } }),
  countProjectsLastMonth: () => prisma.project.count({ where: { createdAt: lastMonth() } }),
  countClientsThisMonth:  () => prisma.client.count({ where: { createdAt: thisMonth() } }),
  countClientsLastMonth:  () => prisma.client.count({ where: { createdAt: lastMonth() } }),
  countTasksThisMonth:    () => prisma.task.count({ where: { createdAt: thisMonth() } }),
  countTasksLastMonth:    () => prisma.task.count({ where: { createdAt: lastMonth() } }),

  // ── Tempo total acumulado e tempo deste mês ───────────────────────
  getTotalTime: () => prisma.project.aggregate({ _sum: { totalTime: true } }),

  // Tempo registrado em sessões encerradas este mês
  getTimeThisMonth: () =>
    prisma.timerSession.aggregate({
      _sum: { duration: true },
      where: { createdAt: thisMonth(), isActive: false },
    }),

  // ── Distribuições ─────────────────────────────────────────────────
  getRecentProjects: () =>
    prisma.project.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        totalTime: true,
        deadline: true,
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),

  getTasksByStatus: () =>
    prisma.task.groupBy({ by: ['status'], _count: { status: true } }),

  getProjectsByStatus: () =>
    prisma.project.groupBy({ by: ['status'], _count: { status: true } }),

  // ── Feed de atividade recente (últimos updates publicados) ──────
  // Inclui `type` para o dashboard escolher o ícone por tipo de evento (§2).
  getRecentActivity: () =>
    prisma.projectUpdate.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        project: { select: { id: true, title: true } },
      },
    }),

  // ── Projetos ativos detalhados (grid de cards do §2) ──────────────
  // "Ativos" = não concluídos nem arquivados. Traz tarefas (só status) para
  // computar concluídas/total e estimatedHours p/ o comparativo de horas.
  getActiveProjectsDetailed: () =>
    prisma.project.findMany({
      where: { status: { notIn: ['COMPLETED', 'ARCHIVED'] } },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        totalTime: true,
        estimatedHours: true,
        deadline: true,
        client: { select: { firstName: true, lastName: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),

  // ── Próximas tarefas (próximos 7 dias, não concluídas) ────────────
  // Ordena por prioridade (HIGH→LOW) e depois por vencimento mais próximo.
  getUpcomingTasks: (from: Date, to: Date) =>
    prisma.task.findMany({
      where: {
        status: { not: 'DONE' },
        dueDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        status: true,
        project: { select: { id: true, title: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 15,
    }),

  // ── Sessões encerradas dos últimos N dias (sparkline de horas) ────
  getSessionsSince: (since: Date) =>
    prisma.timerSession.findMany({
      where: { isActive: false, duration: { not: null }, startTime: { gte: since } },
      select: { startTime: true, duration: true },
    }),

  // ── Resumo financeiro agregado (card de pagamentos do dashboard) ──
  // Traz billing + parcelas por projeto não arquivado para o serviço computar.
  getFinancialProjects: () =>
    prisma.project.findMany({
      where: { status: { notIn: ['ARCHIVED'] } },
      select: {
        id: true,
        billingType: true,
        totalValue: true,
        hourlyRate: true,
        totalTime: true,
        currency: true,
        installments: { select: { value: true, status: true, dueDate: true } },
      },
    }),
};
