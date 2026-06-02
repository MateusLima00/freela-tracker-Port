import prisma from '../config/database';
import { InstallmentStatus } from '@prisma/client';

interface InstallmentInput {
  number: number;
  description?: string | null;
  value: number;
  dueDate?: Date | null;
  status?: InstallmentStatus;
}

export const installmentRepository = {
  findByProject: (projectId: string) =>
    prisma.installment.findMany({ where: { projectId }, orderBy: { number: 'asc' } }),

  findById: (id: string) =>
    prisma.installment.findUnique({ where: { id } }),

  // Substitui todas as parcelas do projeto pelas informadas (operação atômica)
  replaceForProject: (projectId: string, items: InstallmentInput[]) =>
    prisma.$transaction(async (tx) => {
      await tx.installment.deleteMany({ where: { projectId } });
      if (items.length > 0) {
        await tx.installment.createMany({
          data: items.map((it) => ({
            projectId,
            number: it.number,
            description: it.description ?? null,
            value: it.value,
            dueDate: it.dueDate ?? null,
            status: it.status ?? 'PENDING',
            // registra a data de pagamento quando a parcela já vem marcada como paga
            paidAt: it.status === 'PAID' ? new Date() : null,
          })),
        });
      }
      return tx.installment.findMany({ where: { projectId }, orderBy: { number: 'asc' } });
    }),

  update: (id: string, data: { description?: string | null; value?: number; dueDate?: Date | null; status?: InstallmentStatus }) =>
    prisma.installment.update({ where: { id }, data }),

  markPaid: (id: string) =>
    prisma.installment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    }),

  delete: (id: string) =>
    prisma.installment.delete({ where: { id } }),
};
