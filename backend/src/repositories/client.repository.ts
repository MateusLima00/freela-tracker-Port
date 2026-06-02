import prisma from '../config/database';

export const clientRepository = {
  findByEmail: (email: string) =>
    prisma.client.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.client.findUnique({ where: { id } }),

  // Troca de senha: também desliga o flag de troca obrigatória
  updatePassword: (id: string, passwordHash: string) =>
    prisma.client.update({
      where: { id },
      data: { passwordHash, mustChangePassword: false },
    }),
};
