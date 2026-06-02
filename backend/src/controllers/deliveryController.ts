import { Response } from 'express';
import { deliveryService } from '../services/delivery.service';
import { success, error } from '../utils/response.util';
import { auditService } from '../services/audit.service';
import { processAndStoreImages } from '../utils/image.util';
import { IAuthRequest } from '../interfaces';

const NOT_FOUND = ['Entrega não encontrada', 'Projeto não encontrado'];

// Mapeia a mensagem de erro do serviço para o status HTTP adequado.
function fail(res: Response, err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  if (NOT_FOUND.includes(message)) return error(res, message, 404);
  if (message === 'Acesso não permitido') return error(res, message, 403);
  return error(res, message, 400);
}

// Extrai os buffers dos arquivos enviados via multer (campo "images").
function filesToBuffers(req: IAuthRequest): Buffer[] {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  return files.map((f) => f.buffer);
}

export const deliveryController = {
  // ── Admin ─────────────────────────────────────────────────────────────────
  async listByProject(req: IAuthRequest, res: Response) {
    try {
      return success(res, await deliveryService.listByProject(req.params.id));
    } catch (err) {
      return fail(res, err, 'Erro ao listar entregas');
    }
  },

  // Cria a entrega com imagens iniciais (opcionais).
  async create(req: IAuthRequest, res: Response) {
    try {
      const images = await processAndStoreImages(filesToBuffers(req));
      const delivery = await deliveryService.create(req.params.id, {
        title: req.body.title,
        description: req.body.description,
        images,
      });
      return success(res, delivery, 201);
    } catch (err) {
      return fail(res, err, 'Erro ao criar entrega');
    }
  },

  // Sobe uma nova versão da entrega (exige ao menos uma imagem).
  async addVersion(req: IAuthRequest, res: Response) {
    try {
      const buffers = filesToBuffers(req);
      if (buffers.length === 0) return error(res, 'Envie ao menos uma imagem para a nova versão', 400);
      const images = await processAndStoreImages(buffers);
      return success(res, await deliveryService.addVersion(req.params.id, images), 201);
    } catch (err) {
      return fail(res, err, 'Erro ao adicionar versão');
    }
  },

  async unlock(req: IAuthRequest, res: Response) {
    try {
      return success(res, await deliveryService.unlock(req.params.id));
    } catch (err) {
      return fail(res, err, 'Erro ao desbloquear entrega');
    }
  },

  async delete(req: IAuthRequest, res: Response) {
    try {
      await deliveryService.delete(req.params.id);
      return success(res, { message: 'Entrega removida' });
    } catch (err) {
      return fail(res, err, 'Erro ao remover entrega');
    }
  },

  // ── Cliente (portal) ─────────────────────────────────────────────────────────
  async listForClient(req: IAuthRequest, res: Response) {
    try {
      return success(res, await deliveryService.listForClient(req.client!.id, req.params.id));
    } catch (err) {
      return fail(res, err, 'Erro ao listar entregas');
    }
  },

  async approve(req: IAuthRequest, res: Response) {
    try {
      const result = await deliveryService.approve(req.client!.id, req.params.id);
      auditService.record({
        actorType: 'client', actorId: req.client?.id, action: 'delivery.approve',
        targetType: 'Delivery', targetId: req.params.id, ipAddress: req.ip,
      });
      return success(res, result);
    } catch (err) {
      return fail(res, err, 'Erro ao aprovar entrega');
    }
  },

  async requestChanges(req: IAuthRequest, res: Response) {
    try {
      const result = await deliveryService.requestChanges(req.client!.id, req.params.id, req.body.feedback);
      auditService.record({
        actorType: 'client', actorId: req.client?.id, action: 'delivery.requestChanges',
        targetType: 'Delivery', targetId: req.params.id, ipAddress: req.ip,
      });
      return success(res, result);
    } catch (err) {
      return fail(res, err, 'Erro ao solicitar alteração');
    }
  },
};
