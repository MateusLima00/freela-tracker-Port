import { z } from 'zod';

const installmentItemSchema = z.object({
  number: z.number().int().min(1),
  description: z.string().max(200).nullish(),
  value: z.number().min(0).max(9_999_999),
  dueDate: z.string().datetime({ offset: true }).nullish(),
  status: z.enum(['PENDING', 'SENT', 'PAID', 'OVERDUE']).optional(),
});

// Criação em lote (substitui o conjunto de parcelas do projeto)
export const setInstallmentsSchema = z.object({
  installments: z.array(installmentItemSchema).max(60),
});

export const updateInstallmentSchema = z.object({
  description: z.string().max(200).nullish(),
  value: z.number().min(0).max(9_999_999).optional(),
  dueDate: z.string().datetime({ offset: true }).nullish(),
  status: z.enum(['PENDING', 'SENT', 'PAID', 'OVERDUE']).optional(),
});
