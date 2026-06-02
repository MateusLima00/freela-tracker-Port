import prisma from '../config/database';

interface CreateRefreshTokenData {
  tokenHash: string;
  userId?: string;
  clientId?: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export const refreshTokenRepository = {
  create: (data: CreateRefreshTokenData) =>
    prisma.refreshToken.create({ data }),

  // Busca um token ativo (não revogado e não expirado) pelo seu hash
  findActiveByHash: (tokenHash: string) =>
    prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    }),

  revokeById: (id: string) =>
    prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    }),

  // Revoga todas as sessões ativas de um admin (logout-all)
  revokeAllForUser: (userId: string) =>
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),

  // Revoga todas as sessões ativas de um cliente
  revokeAllForClient: (clientId: string) =>
    prisma.refreshToken.updateMany({
      where: { clientId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
};
