import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = {
  viewProgress: true,
  viewDeliveries: true,
  approveDeliveries: true,
  viewUpdates: true,
  viewPayments: false,
  receiveEmailOnDelivery: true,
  receiveEmailOnUpdate: false,
  receiveEmailOnPayment: true,
};

async function main() {
  const adminRaw = process.env.SEED_ADMIN_PASSWORD;
  const clientRaw = process.env.SEED_CLIENT_PASSWORD;
  if (!adminRaw || !clientRaw) {
    throw new Error('Set SEED_ADMIN_PASSWORD and SEED_CLIENT_PASSWORD in .env before running seed');
  }
  const adminPassword = await bcrypt.hash(adminRaw, 12);
  const clientPassword = await bcrypt.hash(clientRaw, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@freela.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@freela.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Cliente demo já com senha definitiva (mustChangePassword=false) para permitir
  // login direto no portal. Clientes criados pelo admin nascem com troca obrigatória.
  const client = await prisma.client.upsert({
    where: { email: 'cliente@freela.com' },
    update: {},
    create: {
      firstName: 'Cliente',
      lastName: 'Demo',
      email: 'cliente@freela.com',
      passwordHash: clientPassword,
      permissions: DEFAULT_PERMISSIONS,
      mustChangePassword: false,
    },
  });

  // Cria o projeto demo apenas se o cliente ainda não tiver nenhum
  const existingProject = await prisma.project.findFirst({ where: { clientId: client.id } });
  const project =
    existingProject ??
    (await prisma.project.create({
      data: {
        title: 'Projeto Demo',
        description: 'Projeto de demonstração do FreelaTracker',
        clientId: client.id,
        progress: 35,
        status: 'IN_PROGRESS',
      },
    }));

  const taskCount = await prisma.task.count({ where: { projectId: project.id } });
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        { title: 'Setup inicial', status: 'DONE', priority: 'HIGH', projectId: project.id },
        { title: 'Implementar autenticação', status: 'DONE', priority: 'HIGH', projectId: project.id },
        { title: 'Criar dashboard', status: 'IN_PROGRESS', priority: 'MEDIUM', projectId: project.id },
        { title: 'Testes finais', status: 'TODO', priority: 'LOW', projectId: project.id },
      ],
    });
  }

  const updateCount = await prisma.projectUpdate.count({ where: { projectId: project.id } });
  if (updateCount === 0) {
    await prisma.projectUpdate.createMany({
      data: [
        {
          projectId: project.id,
          title: 'Início do projeto',
          content: 'Ambiente de desenvolvimento configurado com sucesso.',
        },
        {
          projectId: project.id,
          title: 'Autenticação implementada',
          content: 'Sistema de login e registro funcionando com JWT.',
        },
      ],
    });
  }

  console.log('[Seed] Executado com sucesso!');
  console.log(`  Admin  → ${admin.email}`);
  console.log(`  Client → ${client.email}`);
}

main()
  .catch((e) => {
    console.error('[Seed] Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
