import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response.util';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('[Error]', err.message);
  return error(res, err.message || 'Erro interno do servidor', 500);
}
