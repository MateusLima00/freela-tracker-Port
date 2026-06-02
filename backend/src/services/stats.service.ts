import { statsRepository } from '../repositories/stats.repository';
import { secondsToHHMMSS } from '../utils/time.util';
import { round1, round2 } from '../utils/number.util';

const SECONDS_PER_HOUR = 3600;

// Calcula delta percentual entre dois valores e retorna string formatada
function deltaPercent(current: number, previous: number): { text: string; positive: boolean } {
  if (previous === 0 && current === 0) return { text: '0%', positive: true };
  if (previous === 0) return { text: `+${current} novo${current > 1 ? 's' : ''}`, positive: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    text: `${pct >= 0 ? '+' : ''}${pct}%`,
    positive: pct >= 0,
  };
}

// Chave de dia local YYYY-MM-DD.
function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Série de horas por dia dos últimos 7 dias (inclui hoje), preenchendo dias vazios.
function buildSparkline(sessions: Array<{ startTime: Date; duration: number | null }>) {
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(dayKey(s.startTime), (byDay.get(dayKey(s.startTime)) ?? 0) + (s.duration ?? 0));

  const points: Array<{ date: string; hours: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    points.push({ date: key, hours: round1((byDay.get(key) ?? 0) / SECONDS_PER_HOUR) });
  }
  return points;
}

export const statsService = {
  async getDashboard() {
    // Busca todos os dados em paralelo para minimizar latência
    const [
      totalProjects,
      activeProjects,
      totalClients,
      totalTasks,
      pendingTasks,
      totalTimeResult,
      timeThisMonthResult,
      recentProjects,
      tasksByStatus,
      projectsByStatus,
      recentActivity,
      projectsThisMonth,
      projectsLastMonth,
      clientsThisMonth,
      clientsLastMonth,
      activeProjectsDetailed,
      upcomingTasks,
      sparklineSessions,
      financialProjects,
    ] = await Promise.all([
      statsRepository.countProjects(),
      statsRepository.countActiveProjects(),
      statsRepository.countClients(),
      statsRepository.countTasks(),
      statsRepository.countPendingTasks(),
      statsRepository.getTotalTime(),
      statsRepository.getTimeThisMonth(),
      statsRepository.getRecentProjects(),
      statsRepository.getTasksByStatus(),
      statsRepository.getProjectsByStatus(),
      statsRepository.getRecentActivity(),
      statsRepository.countProjectsThisMonth(),
      statsRepository.countProjectsLastMonth(),
      statsRepository.countClientsThisMonth(),
      statsRepository.countClientsLastMonth(),
      statsRepository.getActiveProjectsDetailed(),
      (() => {
        const from = new Date(); from.setHours(0, 0, 0, 0);
        const to = new Date(from.getTime() + 7 * 86_400_000);
        return statsRepository.getUpcomingTasks(from, to);
      })(),
      statsRepository.getSessionsSince(new Date(Date.now() - 7 * 86_400_000)),
      statsRepository.getFinancialProjects(),
    ]);

    const totalSeconds    = totalTimeResult._sum.totalTime ?? 0;
    const secondsThisMonth = timeThisMonthResult._sum.duration ?? 0;

    const projectsDelta = deltaPercent(projectsThisMonth, projectsLastMonth);
    const clientsDelta  = deltaPercent(clientsThisMonth,  clientsLastMonth);

    // ── Grid de projetos ativos: horas vs estimativa + tarefas done/total ──
    const activeProjectCards = activeProjectsDetailed.map((p) => {
      const tasksTotal = p.tasks.length;
      const tasksDone = p.tasks.filter((t) => t.status === 'DONE').length;
      const hoursLogged = round1(p.totalTime / SECONDS_PER_HOUR);
      const overBudget = p.estimatedHours != null && p.estimatedHours > 0 && hoursLogged > p.estimatedHours;
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        progress: p.progress,
        deadline: p.deadline,
        client: p.client ? { name: `${p.client.firstName} ${p.client.lastName}`.trim() } : null,
        hoursLogged,
        estimatedHours: p.estimatedHours,
        overBudget,
        tasksDone,
        tasksTotal,
      };
    });

    // ── Resumo financeiro agregado (card de pagamentos) ──
    const now = new Date();
    let totalBilled = 0, totalReceived = 0, overdueCount = 0;
    for (const p of financialProjects) {
      const total = p.billingType === 'HOURLY'
        ? (p.totalTime / SECONDS_PER_HOUR) * (p.hourlyRate ?? 0)
        : (p.totalValue ?? 0);
      totalBilled += total;
      for (const inst of p.installments) {
        if (inst.status === 'PAID') totalReceived += inst.value;
        const isOverdue = inst.status === 'OVERDUE'
          || (inst.status !== 'PAID' && inst.dueDate != null && inst.dueDate < now);
        if (isOverdue) overdueCount += 1;
      }
    }
    const financialSummary = {
      currency: financialProjects[0]?.currency ?? 'BRL',
      totalBilled: round2(totalBilled),
      totalReceived: round2(totalReceived),
      balance: round2(totalBilled - totalReceived),
      overdueCount,
    };

    return {
      // Cards do topo
      statCards: [
        {
          key: 'activeProjects',
          label: 'Projetos Ativos',
          value: activeProjects,
          sub: `${totalProjects} total`,
          delta: projectsDelta.text,
          deltaPositive: projectsDelta.positive,
        },
        {
          key: 'clients',
          label: 'Clientes',
          value: totalClients,
          sub: clientsThisMonth > 0 ? `+${clientsThisMonth} este mês` : 'nenhum novo',
          delta: clientsDelta.text,
          deltaPositive: clientsDelta.positive,
        },
        {
          key: 'pendingTasks',
          label: 'Tarefas Pendentes',
          value: pendingTasks,
          sub: `${totalTasks} total`,
          // Delta invertido: menos tarefas pendentes = melhor
          delta: pendingTasks === 0 ? 'Tudo em dia!' : `${pendingTasks} a fazer`,
          deltaPositive: pendingTasks === 0,
        },
        {
          key: 'timeLogged',
          label: 'Tempo Logado',
          value: secondsToHHMMSS(totalSeconds),
          sub: `${secondsToHHMMSS(secondsThisMonth)} este mês`,
          delta: secondsThisMonth > 0 ? `+${secondsToHHMMSS(secondsThisMonth)} este mês` : 'nenhum este mês',
          deltaPositive: secondsThisMonth > 0,
          // Sparkline de horas dos últimos 7 dias (renderizado no card)
          sparkline: buildSparkline(sparklineSessions),
        },
      ],

      // Grid de projetos ativos (§2)
      activeProjects: activeProjectCards,

      // Painel "Próximas tarefas" (próximos 7 dias)
      upcomingTasks: upcomingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        projectId: t.project.id,
        projectTitle: t.project.title,
      })),

      // Resumo financeiro agregado (card de pagamentos)
      financialSummary,

      // Tabela de projetos recentes — concatena nome do cliente p/ a UI
      recentProjects: recentProjects.map((p) => ({
        ...p,
        client: p.client ? { name: `${p.client.firstName} ${p.client.lastName}`.trim() } : null,
        totalTimeFormatted: secondsToHHMMSS(p.totalTime),
      })),

      // Distribuições para os gráficos
      tasksByStatus,
      projectsByStatus,

      // Feed de atividade recente (com tipo p/ ícone e id do projeto p/ navegação)
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        projectId: a.project.id,
        projectTitle: a.project.title,
        updateTitle: a.title,
        type: a.type,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  },
};
