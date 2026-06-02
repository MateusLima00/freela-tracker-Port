import { Response } from 'express';
import { timerService } from '../services/timer.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

export const timerController = {
  async start(req: IAuthRequest, res: Response) {
    try {
      const result = await timerService.start(req.user!.id, req.body);
      return success(res, result, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar timer';
      return error(res, message, 400);
    }
  },

  async pause(req: IAuthRequest, res: Response) {
    try {
      const result = await timerService.pause(req.params.sessionId, req.user!.id);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao pausar timer';
      return error(res, message, 400);
    }
  },

  async resume(req: IAuthRequest, res: Response) {
    try {
      const result = await timerService.resume(req.params.sessionId, req.user!.id);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao retomar timer';
      return error(res, message, 400);
    }
  },

  async stop(req: IAuthRequest, res: Response) {
    try {
      const result = await timerService.stop(req.params.sessionId, req.user!.id, req.body.note);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao parar timer';
      return error(res, message, 400);
    }
  },

  async getByProject(req: IAuthRequest, res: Response) {
    try {
      const result = await timerService.getByProject(req.params.projectId);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return error(res, message, 500);
    }
  },

  async getActive(req: IAuthRequest, res: Response) {
    try {
      const result = await timerService.getActive(req.user!.id);
      return success(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro interno';
      return error(res, message, 500);
    }
  },
};
