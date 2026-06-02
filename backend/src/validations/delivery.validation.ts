import { z } from 'zod';

// Criação de entrega (admin). As imagens da primeira versão são opcionais e
// chegam como multipart — não são validadas por Zod aqui.
export const createDeliverySchema = z.object({
  title: z.string().trim().min(2, 'Título deve ter pelo menos 2 caracteres').max(200),
  description: z.string().max(5000).optional(),
});

// Solicitação de alteração (cliente): feedback obrigatório, mínimo 20 caracteres
// conforme o §8 do CLAUDE.md.
export const requestChangesSchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(20, 'Descreva o que precisa mudar (mínimo 20 caracteres)')
    .max(2000),
});
