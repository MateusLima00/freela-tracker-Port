import { Response } from 'express';
import { installmentService } from '../services/installment.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

const NOT_FOUND = ['Projeto não encontrado', 'Parcela não encontrada'];

function fail(res: Response, err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  return error(res, message, NOT_FOUND.includes(message) ? 404 : 400);
}

export const installmentController = {
  // Resumo financeiro do projeto (admin)
  async getFinancial(req: IAuthRequest, res: Response) {
    try {
      return success(res, await installmentService.getFinancial(req.params.id));
    } catch (err) {
      return fail(res, err, 'Erro ao carregar financeiro');
    }
  },

  // Define/substitui as parcelas do projeto (bulk)
  async setInstallments(req: IAuthRequest, res: Response) {
    try {
      return success(res, await installmentService.setInstallments(req.params.id, req.body.installments));
    } catch (err) {
      return fail(res, err, 'Erro ao salvar parcelas');
    }
  },

  async update(req: IAuthRequest, res: Response) {
    try {
      return success(res, await installmentService.updateInstallment(req.params.id, req.body));
    } catch (err) {
      return fail(res, err, 'Erro ao atualizar parcela');
    }
  },

  async markPaid(req: IAuthRequest, res: Response) {
    try {
      return success(res, await installmentService.markPaid(req.params.id));
    } catch (err) {
      return fail(res, err, 'Erro ao marcar parcela');
    }
  },

  async delete(req: IAuthRequest, res: Response) {
    try {
      await installmentService.deleteInstallment(req.params.id);
      return success(res, { message: 'Parcela removida' });
    } catch (err) {
      return fail(res, err, 'Erro ao remover parcela');
    }
  },
};
