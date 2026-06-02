import { timerRepository } from '../repositories/timer.repository';
import { projectRepository } from '../repositories/project.repository';
import { round2 } from '../utils/number.util';

const SECONDS_PER_HOUR = 3600;

// Chave de dia local (YYYY-MM-DD) a partir de uma data — agrupa sessões por dia
// respeitando o fuso do servidor (consistente com o que o admin vê).
function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Gera todas as chaves de dia entre from e to (inclusive) para que o gráfico de
// barras seja contínuo, mesmo em dias sem sessões.
function enumerateDays(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor <= end) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export const reportService = {
  // Relatório de horas de um projeto no intervalo informado. `from`/`to` são
  // strings ISO opcionais; o padrão é os últimos 30 dias.
  async getProjectReport(projectId: string, fromStr?: string, toStr?: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Projeto não encontrado');

    // Normaliza o intervalo: `to` termina no fim do dia, `from` no início.
    const to = toStr ? new Date(toStr) : new Date();
    to.setHours(23, 59, 59, 999);
    const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 29 * 86_400_000);
    from.setHours(0, 0, 0, 0);

    const sessions = await timerRepository.findByProjectInRange(projectId, from, to);

    // Soma de segundos por dia
    const secondsByDay = new Map<string, number>();
    for (const s of sessions) {
      const key = dayKey(s.startTime);
      secondsByDay.set(key, (secondsByDay.get(key) ?? 0) + (s.duration ?? 0));
    }

    // Série diária contínua (preenche dias vazios com 0)
    const days = enumerateDays(from, to);
    const daily = days.map((date) => {
      const seconds = secondsByDay.get(date) ?? 0;
      return { date, seconds, hours: round2(seconds / SECONDS_PER_HOUR) };
    });

    const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0);
    const totalHours = round2(totalSeconds / SECONDS_PER_HOUR);
    const dailyAverageHours = days.length > 0 ? round2(totalHours / days.length) : 0;

    // Comparativo com a estimativa (se houver)
    const estimatedHours = project.estimatedHours ?? null;
    const estimateComparison =
      estimatedHours && estimatedHours > 0
        ? {
            estimatedHours,
            usedHours: totalHours,
            // % das horas estimadas já consumidas no período
            percentUsed: round2((totalHours / estimatedHours) * 100),
            overBudget: totalHours > estimatedHours,
          }
        : null;

    return {
      project: { id: project.id, title: project.title, estimatedHours },
      range: { from: from.toISOString(), to: to.toISOString() },
      daily,
      sessions: sessions.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        note: s.note,
      })),
      totals: {
        totalSeconds,
        totalHours,
        sessionCount: sessions.length,
        dayCount: days.length,
        dailyAverageHours,
      },
      estimateComparison,
    };
  },
};
