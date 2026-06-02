import { Response } from 'express';
import { projectService } from '../services/project.service';
import { success, error } from '../utils/response.util';
import { auditService } from '../services/audit.service';
import { IAuthRequest } from '../interfaces';

export const projectController = {
  async getAll(_req: IAuthRequest, res: Response) {
    try {
      const result = await projectService.getAll();
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return error(res, message, 500);
    }
  },

  async getById(req: IAuthRequest, res: Response) {
    try {
      const result = await projectService.getById(req.params.id);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Projeto não encontrado';
      return error(res, message, 404);
    }
  },

  async create(req: IAuthRequest, res: Response) {
    try {
      const result = await projectService.create(req.body);
      return success(res, result, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar projeto';
      return error(res, message, 400);
    }
  },

  async update(req: IAuthRequest, res: Response) {
    try {
      const result = await projectService.update(req.params.id, req.body);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar projeto';
      return error(res, message, 400);
    }
  },

  async delete(req: IAuthRequest, res: Response) {
    try {
      await projectService.delete(req.params.id);
      auditService.record({
        actorType: 'admin', actorId: req.user?.id, action: 'project.delete',
        targetType: 'Project', targetId: req.params.id, ipAddress: req.ip,
      });
      return success(res, { message: 'Projeto deletado com sucesso' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar projeto';
      return error(res, message, 400);
    }
  },
};
