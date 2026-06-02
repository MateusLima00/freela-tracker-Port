import { Response } from 'express';
import { taskService } from '../services/task.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

export const taskController = {
  async getByProject(req: IAuthRequest, res: Response) {
    try {
      const result = await taskService.getByProject(req.params.projectId);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return error(res, message, 500);
    }
  },

  async create(req: IAuthRequest, res: Response) {
    try {
      const result = await taskService.create(req.body);
      return success(res, result, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar tarefa';
      return error(res, message, 400);
    }
  },

  async update(req: IAuthRequest, res: Response) {
    try {
      const result = await taskService.update(req.params.id, req.body);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar tarefa';
      return error(res, message, 400);
    }
  },

  async delete(req: IAuthRequest, res: Response) {
    try {
      await taskService.delete(req.params.id);
      return success(res, { message: 'Tarefa deletada com sucesso' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar tarefa';
      return error(res, message, 400);
    }
  },
};
