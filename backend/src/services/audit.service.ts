import { auditLogRepository } from '../repositories/auditLog.repository';
import { logger } from '../config/logger';
import { Prisma } from '@prisma/client';

// Registro de auditoria fire-and-forget: nunca bloqueia nem quebra o fluxo de
// negócio. Falhas ao persistir são apenas logadas.
export const auditService = {
  record(input: {
    actorType: 'admin' | 'client' | 'system';
    actorId?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    ipAddress?: string | null;
    metadata?: Prisma.InputJsonValue;
  }): void {
    auditLogRepository.create(input).catch((err) => {
      logger.error(`[audit] falha ao registrar ${input.action}: ${err instanceof Error ? err.message : err}`);
    });
  },
};
