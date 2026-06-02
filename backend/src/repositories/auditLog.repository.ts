import prisma from '../config/database';
import { Prisma } from '@prisma/client';

interface AuditInput {
  actorType: 'admin' | 'client' | 'system';
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export const auditLogRepository = {
  create: (data: AuditInput) =>
    prisma.auditLog.create({
      data: {
        actorType: data.actorType,
        actorId: data.actorId ?? null,
        action: data.action,
        targetType: data.targetType ?? null,
        targetId: data.targetId ?? null,
        ipAddress: data.ipAddress ?? null,
        metadata: data.metadata,
      },
    }),
};
