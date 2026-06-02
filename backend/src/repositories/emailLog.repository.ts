import prisma from '../config/database';
import { EmailStatus } from '@prisma/client';

interface EmailLogInput {
  projectId?: string | null;
  to: string;
  subject: string;
  body: string;
  event: string;
  status: EmailStatus;
  error?: string | null;
}

export const emailLogRepository = {
  create: (data: EmailLogInput) =>
    prisma.emailLog.create({
      data: {
        projectId: data.projectId ?? null,
        to: data.to,
        subject: data.subject,
        body: data.body,
        event: data.event,
        status: data.status,
        error: data.error ?? null,
      },
    }),

  // Histórico de e-mails de um projeto (mais recentes primeiro) — exibido no
  // detalhe do projeto (admin).
  findByProject: (projectId: string) =>
    prisma.emailLog.findMany({
      where: { projectId },
      orderBy: { sentAt: 'desc' },
      take: 50,
    }),

  // Existe um e-mail com esse `event` enviado depois de `since`? Usado para
  // deduplicar lembretes de parcela (não reenviar o mesmo aviso no mesmo dia).
  async existsRecent(event: string, since: Date): Promise<boolean> {
    const found = await prisma.emailLog.findFirst({
      where: { event, sentAt: { gte: since } },
      select: { id: true },
    });
    return found !== null;
  },
};
