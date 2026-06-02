import prisma from '../config/database';
import { CreateUpdateDTO, UpdateProjectUpdateDTO } from '../dto/update.dto';

export const updateRepository = {
  findByProject: (projectId: string) =>
    prisma.projectUpdate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string) =>
    prisma.projectUpdate.findUnique({ where: { id } }),

  create: (data: CreateUpdateDTO) =>
    prisma.projectUpdate.create({ data }),

  update: (id: string, data: UpdateProjectUpdateDTO) =>
    prisma.projectUpdate.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.projectUpdate.delete({ where: { id } }),
};
