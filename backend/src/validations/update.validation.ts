import { z } from 'zod';

export const createUpdateSchema = z.object({
  projectId: z.string().min(1, 'projectId é obrigatório'),
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  content: z.string().min(5, 'Conteúdo deve ter pelo menos 5 caracteres'),
});

export const editUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  content: z.string().min(5).optional(),
});
