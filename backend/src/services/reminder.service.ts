import prisma from '../config/database';
import { emailService } from './email.service';
import { emailLogRepository } from '../repositories/emailLog.repository';

const DAY_MS = 86_400_000;
const DUE_SOON_DAYS = 3; // janela de "próximo do vencimento"

// Formata valor em BRL (pt-BR) — backend não tem util de moeda do front.
function money(value: number, currency = 'BRL'): string {
  try {
    return value.toLocaleString('pt-BR', { style: 'currency', currency });
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function dateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

// Carrega parcela + projeto + cliente (com permissões) para as notificações.
const installmentInclude = {
  project: {
    select: {
      id: true,
      title: true,
      currency: true,
      client: { select: { email: true, firstName: true, permissions: true } },
    },
  },
} as const;

export const reminderService = {
  // Varre parcelas e dispara lembretes. Idempotente no dia: usa o EmailLog para
  // não reenviar o mesmo aviso (event "installment.*:<id>") dentro de ~20h.
  // Pensado para rodar 1x/dia (ver scheduler no server.ts).
  async runDueReminders(): Promise<void> {
    const now = new Date();
    const dedupSince = new Date(now.getTime() - 20 * 3_600_000); // 20h atrás

    // ── Parcelas próximas do vencimento → cliente ──
    const soonLimit = new Date(now.getTime() + DUE_SOON_DAYS * DAY_MS);
    const dueSoon = await prisma.installment.findMany({
      where: {
        status: { in: ['PENDING', 'SENT'] },
        dueDate: { gte: now, lte: soonLimit },
      },
      include: installmentInclude,
    });

    for (const inst of dueSoon) {
      const client = inst.project.client;
      if (!client?.email || !inst.dueDate) continue;
      if (await emailLogRepository.existsRecent(`installment.dueSoon:${inst.id}`, dedupSince)) continue;

      emailService.installmentDueSoon(
        client,
        inst.id,
        inst.project.id,
        inst.project.title,
        money(inst.value, inst.project.currency),
        dateBR(inst.dueDate),
      );
    }

    // ── Parcelas vencidas → admin (e marca status OVERDUE) ──
    const overdue = await prisma.installment.findMany({
      where: {
        status: { in: ['PENDING', 'SENT'] },
        dueDate: { lt: now },
      },
      include: installmentInclude,
    });

    for (const inst of overdue) {
      if (!inst.dueDate) continue;

      // Atualiza o status para refletir o atraso (uma vez).
      if (inst.status !== 'OVERDUE') {
        await prisma.installment.update({ where: { id: inst.id }, data: { status: 'OVERDUE' } });
      }
      if (await emailLogRepository.existsRecent(`installment.overdue:${inst.id}`, dedupSince)) continue;

      emailService.installmentOverdue(
        inst.id,
        inst.project.id,
        inst.project.title,
        money(inst.value, inst.project.currency),
        dateBR(inst.dueDate),
      );
    }
  },
};
