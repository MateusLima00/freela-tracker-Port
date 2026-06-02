import { Response } from 'express';
import { adminClientService } from '../services/adminClient.service';
import { success, error } from '../utils/response.util';
import { auditService } from '../services/audit.service';
import { IAuthRequest } from '../interfaces';

export const adminClientController = {
  async list(_req: IAuthRequest, res: Response) {
    try {
      return success(res, await adminClientService.list());
    } catch (err: unknown) {
      return error(res, err instanceof Error ? err.message : 'Erro interno', 500);
    }
  },

  async getById(req: IAuthRequest, res: Response) {
    try {
      return success(res, await adminClientService.getById(req.params.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cliente não encontrado';
      return error(res, msg, msg === 'Cliente não encontrado' ? 404 : 500);
    }
  },

  async create(req: IAuthRequest, res: Response) {
    try {
      const created = await adminClientService.create(req.body);
      auditService.record({
        actorType: 'admin', actorId: req.user?.id, action: 'client.create',
        targetType: 'Client', targetId: created.id, ipAddress: req.ip,
      });
      return success(res, created, 201);
    } catch (err: unknown) {
      return error(res, err instanceof Error ? err.message : 'Erro ao criar cliente', 400);
    }
  },

  async update(req: IAuthRequest, res: Response) {
    try {
      return success(res, await adminClientService.update(req.params.id, req.body));
    } catch (err: unknown) {
      return error(res, err instanceof Error ? err.message : 'Erro ao atualizar cliente', 400);
    }
  },

  async delete(req: IAuthRequest, res: Response) {
    try {
      await adminClientService.delete(req.params.id);
      auditService.record({
        actorType: 'admin', actorId: req.user?.id, action: 'client.delete',
        targetType: 'Client', targetId: req.params.id, ipAddress: req.ip,
      });
      return success(res, { message: 'Cliente removido com sucesso' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover cliente';
      return error(res, msg, msg === 'Cliente não encontrado' ? 404 : 400);
    }
  },

  async linkProject(req: IAuthRequest, res: Response) {
    try {
      return success(res, await adminClientService.linkProject(req.params.id, req.params.projectId));
    } catch (err: unknown) {
      return error(res, err instanceof Error ? err.message : 'Erro ao vincular projeto', 400);
    }
  },

  async unlinkProject(req: IAuthRequest, res: Response) {
    try {
      await adminClientService.unlinkProject(req.params.id, req.params.projectId);
      return success(res, { message: 'Vínculo removido com sucesso' });
    } catch (err: unknown) {
      return error(res, err instanceof Error ? err.message : 'Erro ao remover vínculo', 400);
    }
  },

  async listUnlinkedProjects(_req: IAuthRequest, res: Response) {
    try {
      return success(res, await adminClientService.listUnlinkedProjects());
    } catch (err: unknown) {
      return error(res, err instanceof Error ? err.message : 'Erro interno', 500);
    }
  },
};
