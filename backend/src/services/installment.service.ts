import prisma from '../config/database';
import { installmentRepository } from '../repositories/installment.repository';
import { round2 } from '../utils/number.util';
import { InstallmentStatus } from '@prisma/client';

interface SetInstallmentItem {
  number: number;
  description?: string | null;
  value: number;
  dueDate?: string | null;
  status?: InstallmentStatus;
}

// Carrega os dados de billing do projeto + parcelas
async function loadProjectBilling(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      billingType: true,
      totalValue: true,
      hourlyRate: true,
      currency: true,
      totalTime: true,
      installments: { orderBy: { number: 'asc' } },
    },
  });
  if (!project) throw new Error('Projeto não encontrado');
  return project;
}

// Resumo financeiro completo (visão admin)
function buildSummary(project: Awaited<ReturnType<typeof loadProjectBilling>>) {
  const { billingType, totalValue, hourlyRate, currency, totalTime, installments } = project;

  const hours = round2(totalTime / 3600);
  const computedFromHours = round2(hours * (hourlyRate ?? 0));
  const total = billingType === 'HOURLY' ? computedFromHours : round2(totalValue ?? 0);

  const totalPaid = round2(
    installments.filter((i) => i.status === 'PAID').reduce((acc, i) => acc + i.value, 0),
  );
  const sumInstallments = round2(installments.reduce((acc, i) => acc + i.value, 0));

  // Próxima parcela em aberto (com vencimento), ordenada por data
  const nextDue = installments
    .filter((i) => i.status !== 'PAID' && i.dueDate)
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())[0] ?? null;

  return {
    billingType,
    currency,
    total,
    totalPaid,
    balance: round2(total - totalPaid),
    hours: billingType === 'HOURLY' ? hours : null,
    hourlyRate: billingType === 'HOURLY' ? hourlyRate ?? 0 : null,
    sumInstallments,
    // Para INSTALLMENTS: a soma das parcelas bate com o valor total?
    installmentsMatchTotal:
      billingType === 'INSTALLMENTS' ? Math.abs(sumInstallments - total) < 0.01 : null,
    nextDueDate: nextDue?.dueDate ?? null,
    installments,
  };
}

export const installmentService = {
  // ── Admin ──────────────────────────────────────────────────────────────────
  async getFinancial(projectId: string) {
    const project = await loadProjectBilling(projectId);
    return buildSummary(project);
  },

  async setInstallments(projectId: string, items: SetInstallmentItem[]) {
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!exists) throw new Error('Projeto não encontrado');

    await installmentRepository.replaceForProject(
      projectId,
      items.map((it) => ({
        number: it.number,
        description: it.description ?? null,
        value: it.value,
        dueDate: it.dueDate ? new Date(it.dueDate) : null,
        status: it.status,
      })),
    );
    return this.getFinancial(projectId);
  },

  async updateInstallment(id: string, data: { description?: string | null; value?: number; dueDate?: string | null; status?: InstallmentStatus }) {
    const installment = await installmentRepository.findById(id);
    if (!installment) throw new Error('Parcela não encontrada');
    const updated = await installmentRepository.update(id, {
      description: data.description,
      value: data.value,
      dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
      status: data.status,
    });
    return updated;
  },

  async markPaid(id: string) {
    const installment = await installmentRepository.findById(id);
    if (!installment) throw new Error('Parcela não encontrada');
    return installmentRepository.markPaid(id);
  },

  async deleteInstallment(id: string) {
    const installment = await installmentRepository.findById(id);
    if (!installment) throw new Error('Parcela não encontrada');
    await installmentRepository.delete(id);
  },

  // ── Cliente (portal) ─────────────────────────────────────────────────────────
  // Visão segura: status colapsado em PAID|PENDING (não expõe SENT/OVERDUE internos)
  // e oculta o campo paidAt de parcelas não pagas.
  async getClientFinancial(projectId: string) {
    const summary = await this.getFinancial(projectId);
    return {
      billingType: summary.billingType,
      currency: summary.currency,
      total: summary.total,
      totalPaid: summary.totalPaid,
      balance: summary.balance,
      hours: summary.hours,
      hourlyRate: summary.hourlyRate,
      installments: summary.installments.map((i) => ({
        id: i.id,
        number: i.number,
        description: i.description,
        value: i.value,
        dueDate: i.dueDate,
        status: i.status === 'PAID' ? 'PAID' : 'PENDING',
        paidAt: i.status === 'PAID' ? i.paidAt : null,
      })),
    };
  },
};
