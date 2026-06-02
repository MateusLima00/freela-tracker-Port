import { z } from 'zod';

export const createProjectSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres').max(200),
  description: z.string().max(5000).optional(),
  clientId: z.string().min(1).max(100).optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'AWAITING_CLIENT', 'COMPLETED', 'PAUSED', 'ARCHIVED']).optional(),
  deadline: z.string().datetime({ offset: true }).nullish(),
  // Estimativa de horas (Fase 9) — base do comparativo nos relatórios
  estimatedHours: z.number().min(0).max(99_999).nullish(),
  // ── Financeiro ──
  billingType: z.enum(['FIXED', 'HOURLY', 'INSTALLMENTS']).optional(),
  totalValue: z.number().min(0).max(9_999_999).nullish(),
  hourlyRate: z.number().min(0).max(99_999).nullish(),
  currency: z.string().length(3).optional(),
});
