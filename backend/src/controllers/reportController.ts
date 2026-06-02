import { Response } from 'express';
import { reportService } from '../services/report.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

export const reportController = {
  // Relatório de horas de um projeto (ADMIN). Aceita ?from= e ?to= (ISO).
  async getProjectReport(req: IAuthRequest, res: Response) {
    try {
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      return success(res, await reportService.getProjectReport(req.params.id, from, to));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      return error(res, message, message === 'Projeto não encontrado' ? 404 : 400);
    }
  },
};
