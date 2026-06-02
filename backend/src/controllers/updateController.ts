import { Response } from 'express';
import { updateService } from '../services/update.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

export const updateController = {
  async getByProject(req: IAuthRequest, res: Response) {
    try {
      const result = await updateService.getByProject(req.params.projectId);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return error(res, message, 500);
    }
  },

  async create(req: IAuthRequest, res: Response) {
    try {
      const result = await updateService.create(req.body);
      return success(res, result, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar atualização';
      return error(res, message, 400);
    }
  },

  async update(req: IAuthRequest, res: Response) {
    try {
      const result = await updateService.update(req.params.id, req.body);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao editar atualização';
      return error(res, message, 400);
    }
  },

  async delete(req: IAuthRequest, res: Response) {
    try {
      await updateService.delete(req.params.id);
      return success(res, { message: 'Atualização deletada com sucesso' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar atualização';
      return error(res, message, 400);
    }
  },
};
