import { deliveryRepository } from '../repositories/delivery.repository';
import { projectRepository } from '../repositories/project.repository';
import { clientRepository } from '../repositories/client.repository';
import { updateRepository } from '../repositories/update.repository';
import { emailService } from './email.service';
import { deleteStoredImages } from '../utils/image.util';
import { normalizePermissions } from '../utils/permissions.util';

const NOT_FOUND = 'Entrega não encontrada';
const NO_ACCESS = 'Acesso não permitido';

// Tipo retornado pelo repositório com versões + projeto/cliente embutidos.
type DeliveryWithRelations = NonNullable<Awaited<ReturnType<typeof deliveryRepository.findById>>>;

// A "versão corrente" é sempre a de maior número — o repositório já devolve as
// versões em ordem decrescente, então é a primeira.
function currentVersion(delivery: DeliveryWithRelations) {
  return delivery.versions[0] ?? null;
}

export const deliveryService = {
  // ── Admin ─────────────────────────────────────────────────────────────────
  async listByProject(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Projeto não encontrado');
    return deliveryRepository.findByProject(projectId);
  },

  // Cria a entrega (versão 1) com as imagens já processadas. Notifica o cliente
  // vinculado, se houver e se a permissão de e-mail estiver ativa.
  async create(projectId: string, data: { title: string; description?: string; images: string[] }) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Projeto não encontrado');

    const delivery = await deliveryRepository.create({ projectId, ...data });

    // Registra no feed de atividade do projeto (ícone de entrega no dashboard).
    await updateRepository.create({
      projectId,
      title: `Nova entrega: ${delivery.title}`,
      content: data.description ?? 'Entrega enviada para revisão.',
      type: 'DELIVERY',
    });

    if (project.clientId) {
      const client = await clientRepository.findById(project.clientId);
      if (client) {
        emailService.deliveryCreated(client, projectId, project.title, delivery.title);
      }
    }
    return delivery;
  },

  // Acrescenta uma nova versão (após feedback). Calcula o próximo número a partir
  // da versão corrente e volta a entrega para revisão.
  async addVersion(deliveryId: string, images: string[]) {
    const delivery = await deliveryRepository.findById(deliveryId);
    if (!delivery) throw new Error(NOT_FOUND);

    const next = (currentVersion(delivery)?.versionNumber ?? 0) + 1;
    return deliveryRepository.addVersion(deliveryId, next, images);
  },

  // Desbloqueia uma entrega aprovada para permitir nova revisão do cliente.
  async unlock(deliveryId: string) {
    const delivery = await deliveryRepository.findById(deliveryId);
    if (!delivery) throw new Error(NOT_FOUND);
    return deliveryRepository.unlock(deliveryId);
  },

  // Remove a entrega e apaga as imagens físicas de todas as versões.
  async delete(deliveryId: string) {
    const delivery = await deliveryRepository.findById(deliveryId);
    if (!delivery) throw new Error(NOT_FOUND);

    const allImages = delivery.versions.flatMap((v) => v.images);
    await deliveryRepository.delete(deliveryId);
    await deleteStoredImages(allImages);
  },

  // ── Cliente (portal) ─────────────────────────────────────────────────────────
  // Carrega entrega validando posse + permissão. Lança o mesmo erro NOT_FOUND
  // para "não existe" e "é de outro cliente" (evita enumeração).
  async loadOwnedDelivery(clientId: string, deliveryId: string, requirePermission: keyof ReturnType<typeof normalizePermissions>) {
    const client = await clientRepository.findById(clientId);
    if (!client) throw new Error(NOT_FOUND);

    const delivery = await deliveryRepository.findById(deliveryId);
    if (!delivery || delivery.project.clientId !== clientId) throw new Error(NOT_FOUND);

    const permissions = normalizePermissions(client.permissions);
    if (!permissions[requirePermission]) throw new Error(NO_ACCESS);

    return delivery;
  },

  // Lista entregas do projeto para o cliente (gated por viewDeliveries + posse).
  async listForClient(clientId: string, projectId: string) {
    const client = await clientRepository.findById(clientId);
    if (!client) throw new Error(NOT_FOUND);

    const permissions = normalizePermissions(client.permissions);
    if (!permissions.viewDeliveries) throw new Error(NO_ACCESS);

    const project = await projectRepository.findByIdForClient(projectId);
    if (!project || project.clientId !== clientId) throw new Error(NOT_FOUND);

    return deliveryRepository.findByProject(projectId);
  },

  // Cliente aprova: exige approveDeliveries, posse e que não esteja bloqueada.
  async approve(clientId: string, deliveryId: string) {
    const delivery = await this.loadOwnedDelivery(clientId, deliveryId, 'approveDeliveries');

    if (delivery.lockedAt) throw new Error('Entrega já aprovada e bloqueada');
    const version = currentVersion(delivery);
    if (!version) throw new Error('Entrega sem versão para aprovar');

    const approved = await deliveryRepository.approve(deliveryId, version.id);
    await updateRepository.create({
      projectId: delivery.project.id,
      title: `Entrega aprovada: ${delivery.title}`,
      content: 'O cliente aprovou a entrega.',
      type: 'APPROVAL',
    });
    emailService.deliveryApproved(delivery.project.id, delivery.project.title, delivery.title);
    return approved;
  },

  // Cliente solicita alteração: feedback obrigatório (validado na rota).
  async requestChanges(clientId: string, deliveryId: string, feedback: string) {
    const delivery = await this.loadOwnedDelivery(clientId, deliveryId, 'approveDeliveries');

    if (delivery.lockedAt) throw new Error('Entrega aprovada e bloqueada — não pode ser alterada');
    const version = currentVersion(delivery);
    if (!version) throw new Error('Entrega sem versão para revisar');

    const updated = await deliveryRepository.requestChanges(deliveryId, version.id, feedback);
    await updateRepository.create({
      projectId: delivery.project.id,
      title: `Alteração solicitada: ${delivery.title}`,
      content: feedback,
      type: 'REJECTION',
    });
    emailService.deliveryRejected(delivery.project.id, delivery.project.title, delivery.title, feedback);
    return updated;
  },
};
