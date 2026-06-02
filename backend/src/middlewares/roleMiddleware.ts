import { Response, NextFunction } from 'express';
import { Role } from '../enums';
import { error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';

// Exige um admin com uma das roles informadas (somente tokens kind=admin têm req.user)
export function requireRole(...roles: Role[]) {
  return (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, 'Acesso negado', 403);
    }
    next();
  };
}

// Exige um cliente autenticado (token kind=client → req.client preenchido)
export function requireClient(req: IAuthRequest, res: Response, next: NextFunction) {
  if (!req.client) return error(res, 'Acesso negado', 403);
  next();
}
