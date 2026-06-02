import { Response } from 'express';
import { clientService } from '../services/client.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

const NOT_FOUND_MSG = 'Projeto não encontrado';

export const clientController = {
  async getMyProjects(req: IAuthRequest, res: Response) {
    try {
      const result = await clientService.getMyProjects(req.client!.id);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return error(res, message, 500);
    }
  },

  async getMyProject(req: IAuthRequest, res: Response) {
    try {
      const result = await clientService.getMyProject(req.client!.id, req.params.id);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : NOT_FOUND_MSG;
      // 404 só para "projeto não encontrado"; erros inesperados → 500
      const status = message === NOT_FOUND_MSG ? 404 : 500;
      return error(res, message, status);
    }
  },

  async getProjectUpdates(req: IAuthRequest, res: Response) {
    try {
      const result = await clientService.getProjectUpdates(req.client!.id, req.params.id);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : NOT_FOUND_MSG;
      const status = message === 'Acesso não permitido' ? 403 : message === NOT_FOUND_MSG ? 404 : 500;
      return error(res, message, status);
    }
  },

  async getFinancial(req: IAuthRequest, res: Response) {
    try {
      const result = await clientService.getFinancial(req.client!.id, req.params.id);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : NOT_FOUND_MSG;
      const status = message === 'Acesso não permitido' ? 403 : message === NOT_FOUND_MSG ? 404 : 500;
      return error(res, message, status);
    }
  },
};
