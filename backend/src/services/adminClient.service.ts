import prisma from '../config/database';
import { clientRepository } from '../repositories/client.repository';
import { projectRepository } from '../repositories/project.repository';
import { hashPassword } from '../utils/hash.util';
import { normalizePermissions } from '../utils/permissions.util';
import { emailService } from './email.service';
import { IClientPermissions } from '../interfaces';

interface CreateClientData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  notes?: string;
  permissions?: Partial<IClientPermissions>;
  projectIds?: string[];
}

interface UpdateClientData {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  notes?: string;
  permissions?: Partial<IClientPermissions>;
}

// Deriva firstName/lastName a partir de um `name` único quando o front antigo
// ainda envia só `name` (a UI dedicada virá na Fase 3).
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  const firstName = parts.shift() ?? '';
  return { firstName, lastName: parts.join(' ') };
}

// Acrescenta o campo derivado `name` para manter compatibilidade com a UI atual.
function withName<T extends { firstName: string; lastName: string }>(client: T) {
  return { ...client, name: `${client.firstName} ${client.lastName}`.trim() };
}

const adminListSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  createdAt: true,
} as const;

export const adminClientService = {
  // Lista clientes com contagem de projetos
  async list() {
    const clients = await prisma.client.findMany({
      select: { ...adminListSelect, _count: { select: { projects: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return clients.map(withName);
  },

  // Retorna cliente com todos os projetos vinculados (inclui notes/permissions p/ o admin)
  async getById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        notes: true,
        permissions: true,
        mustChangePassword: true,
        createdAt: true,
        projects: {
          select: { id: true, title: true, status: true, progress: true, deadline: true, totalTime: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!client) throw new Error('Cliente não encontrado');
    return withName(client);
  },

  // Cria o cliente (senha hash, troca obrigatória no 1º acesso) e vincula projetos
  async create(data: CreateClientData) {
    const existing = await clientRepository.findByEmail(data.email);
    if (existing) throw new Error('Email já está em uso');

    let firstName = data.firstName?.trim();
    let lastName = data.lastName?.trim();
    if (!firstName) {
      const split = splitName(data.name ?? '');
      firstName = split.firstName;
      lastName = lastName ?? split.lastName;
    }
    if (!firstName) throw new Error('Nome é obrigatório');

    const passwordHash = await hashPassword(data.password);

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName: lastName ?? '',
        email: data.email,
        passwordHash,
        notes: data.notes,
        permissions: normalizePermissions(data.permissions) as object,
        mustChangePassword: true,
      },
      select: { ...adminListSelect, mustChangePassword: true },
    });

    if (data.projectIds?.length) {
      await prisma.project.updateMany({
        where: { id: { in: data.projectIds } },
        data: { clientId: client.id },
      });
    }

    // E-mail de boas-vindas com as credenciais (senha temporária em claro — só
    // existe aqui, antes do hash). Fire-and-forget: não bloqueia a criação.
    emailService.welcome({ email: client.email, firstName: client.firstName }, data.password);

    return withName(client);
  },

  // Atualiza dados do cliente (nome, email, notas internas, permissões)
  async update(id: string, data: UpdateClientData) {
    const client = await clientRepository.findById(id);
    if (!client) throw new Error('Cliente não encontrado');

    if (data.email && data.email !== client.email) {
      const existing = await clientRepository.findByEmail(data.email);
      if (existing) throw new Error('Email já está em uso');
    }

    // Permite atualizar nome via `name` único ou firstName/lastName separados
    let firstName = data.firstName;
    let lastName = data.lastName;
    if (firstName === undefined && lastName === undefined && data.name) {
      const split = splitName(data.name);
      firstName = split.firstName;
      lastName = split.lastName;
    }

    // Permissões: mescla parcial sobre as existentes
    const permissions = data.permissions
      ? (normalizePermissions({ ...(client.permissions as object), ...data.permissions }) as object)
      : undefined;

    const updated = await prisma.client.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email: data.email,
        notes: data.notes,
        permissions,
      },
      select: { ...adminListSelect, notes: true, permissions: true, mustChangePassword: true },
    });
    return withName(updated);
  },

  // Remove o cliente — projetos ficam sem cliente (clientId = null via SetNull)
  async delete(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw new Error('Cliente não encontrado');
    await prisma.client.delete({ where: { id } });
  },

  // Vincula um projeto existente a este cliente
  async linkProject(clientId: string, projectId: string) {
    const client = await clientRepository.findById(clientId);
    if (!client) throw new Error('Cliente não encontrado');

    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Projeto não encontrado');

    return prisma.project.update({
      where: { id: projectId },
      data: { clientId },
      select: { id: true, title: true, status: true, progress: true, deadline: true, totalTime: true },
    });
  },

  // Remove vínculo do projeto com este cliente (projeto fica sem cliente)
  async unlinkProject(clientId: string, projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Projeto não encontrado');
    if (project.clientId !== clientId) throw new Error('Projeto não pertence a este cliente');

    return prisma.project.update({
      where: { id: projectId },
      data: { clientId: null },
      select: { id: true, title: true },
    });
  },

  // Lista projetos sem cliente vinculado (disponíveis para vincular)
  async listUnlinkedProjects() {
    return prisma.project.findMany({
      where: { clientId: null },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
  },
};
