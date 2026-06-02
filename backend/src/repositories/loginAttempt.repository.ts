import prisma from '../config/database';

export const loginAttemptRepository = {
  // Registra uma tentativa (sucesso/falha) por identificador (e-mail) + IP.
  create: (identifier: string, ipAddress: string | undefined, success: boolean) =>
    prisma.loginAttempt.create({
      data: { identifier: identifier.toLowerCase(), ipAddress: ipAddress ?? null, success },
    }),

  // Conta falhas recentes (desde `since`) de um identificador — base do bloqueio.
  countRecentFailures: (identifier: string, since: Date) =>
    prisma.loginAttempt.count({
      where: { identifier: identifier.toLowerCase(), success: false, createdAt: { gte: since } },
    }),

  // Limpa o histórico de falhas após um login bem-sucedido.
  clearFailures: (identifier: string) =>
    prisma.loginAttempt.deleteMany({
      where: { identifier: identifier.toLowerCase(), success: false },
    }),
};
