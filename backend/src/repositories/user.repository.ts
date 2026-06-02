import prisma from '../config/database';
import { Role } from '../enums';

// User representa contas administrativas (o freelancer). Clientes têm model próprio.
export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findById: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  create: (data: { name: string; email: string; password: string }) =>
    prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: Role.ADMIN,
      },
    }),
};
