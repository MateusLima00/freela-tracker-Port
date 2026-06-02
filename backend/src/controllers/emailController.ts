import { Response } from 'express';
import { emailService } from '../services/email.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

function fail(res: Response, err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return error(res, message, message === 'Projeto não encontrado' ? 404 : 400);
}

export const emailController = {
  // Histórico de e-mails do projeto (ADMIN)
  async listByProject(req: IAuthRequest, res: Response) {
    try {
      return success(res, await emailService.listByProject(req.params.id));
    } catch (err) {
      return fail(res, err, 'Erro ao listar e-mails');
    }
  },

  // Envia um e-mail manual ao cliente do projeto (ADMIN)
  async send(req: IAuthRequest, res: Response) {
    try {
      const logs = await emailService.sendProjectEmail(req.params.id, req.body.subject, req.body.message);
      return success(res, logs, 201);
    } catch (err) {
      return fail(res, err, 'Erro ao enviar e-mail');
    }
  },
};
