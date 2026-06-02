import { z } from 'zod';

// E-mail manual enviado pelo admin a partir do detalhe do projeto (Fase 8).
export const sendEmailSchema = z.object({
  subject: z.string().trim().min(2, 'Assunto obrigatório').max(200),
  message: z.string().trim().min(5, 'Mensagem muito curta').max(5000),
});
