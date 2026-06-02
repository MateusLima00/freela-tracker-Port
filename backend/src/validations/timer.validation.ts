import { z } from 'zod';

export const startTimerSchema = z.object({
  projectId: z.string().min(1, 'projectId é obrigatório'),
  note: z.string().max(2000).optional(),
});

// Nota obrigatória ao parar — vira uma atualização no feed do projeto
export const stopTimerSchema = z.object({
  note: z
    .string()
    .trim()
    .min(10, 'Descreva o que foi feito (mínimo 10 caracteres)')
    .max(2000),
});
