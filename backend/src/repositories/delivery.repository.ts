import prisma from '../config/database';

// Inclui as versões sempre na mesma ordem (mais recente primeiro) para o front
// montar o histórico sem reordenar.
const versionsInclude = {
  versions: { orderBy: { versionNumber: 'desc' } },
} as const;

export const deliveryRepository = {
  // Lista entregas de um projeto com seu histórico de versões
  findByProject: (projectId: string) =>
    prisma.delivery.findMany({
      where: { projectId },
      include: versionsInclude,
      orderBy: { createdAt: 'desc' },
    }),

  // Busca uma entrega com versões e dados mínimos do projeto/cliente — usado para
  // validação de posse (ownership) e para disparar notificações por e-mail.
  findById: (id: string) =>
    prisma.delivery.findUnique({
      where: { id },
      include: {
        ...versionsInclude,
        project: {
          select: {
            id: true,
            title: true,
            clientId: true,
            client: { select: { id: true, firstName: true, lastName: true, email: true, permissions: true } },
          },
        },
      },
    }),

  // Cria a entrega já com a versão 1 (imagens iniciais opcionais)
  create: (data: { projectId: string; title: string; description?: string; images: string[] }) =>
    prisma.delivery.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        versions: {
          create: { versionNumber: 1, images: data.images },
        },
      },
      include: versionsInclude,
    }),

  // Acrescenta uma nova versão (admin) após feedback do cliente. Recebe o número
  // já calculado pelo serviço e volta a entrega para revisão.
  addVersion: (deliveryId: string, versionNumber: number, images: string[]) =>
    prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'PENDING_REVIEW',
        versions: { create: { versionNumber, images } },
      },
      include: versionsInclude,
    }),

  // Aprova a entrega: trava (lockedAt) e marca a versão corrente como revisada.
  approve: (deliveryId: string, currentVersionId: string) =>
    prisma.$transaction(async (tx) => {
      await tx.deliveryVersion.update({
        where: { id: currentVersionId },
        data: { reviewedAt: new Date() },
      });
      return tx.delivery.update({
        where: { id: deliveryId },
        data: { status: 'APPROVED', lockedAt: new Date() },
        include: versionsInclude,
      });
    }),

  // Solicita alteração: registra o feedback na versão corrente e marca a entrega
  // como reprovada (aguardando nova versão do admin).
  requestChanges: (deliveryId: string, currentVersionId: string, feedback: string) =>
    prisma.$transaction(async (tx) => {
      await tx.deliveryVersion.update({
        where: { id: currentVersionId },
        data: { feedback, reviewedAt: new Date() },
      });
      return tx.delivery.update({
        where: { id: deliveryId },
        data: { status: 'REJECTED' },
        include: versionsInclude,
      });
    }),

  // Desbloqueia uma entrega aprovada (admin) — volta a aguardar revisão.
  unlock: (deliveryId: string) =>
    prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING_REVIEW', lockedAt: null },
      include: versionsInclude,
    }),

  delete: (deliveryId: string) =>
    prisma.delivery.delete({ where: { id: deliveryId } }),
};
