import { Response } from 'express';
import { statsService } from '../services/stats.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

export const statsController = {
  async getDashboard(_req: IAuthRequest, res: Response) {
    try {
      const result = await statsService.getDashboard();
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return error(res, message, 500);
    }
  },
};
