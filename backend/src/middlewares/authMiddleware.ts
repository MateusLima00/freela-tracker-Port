import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';
import { Role } from '../enums';

// Lê o access token do header Authorization: Bearer (curta duração).
// Mantém fallback para cookie `access_token` apenas para conveniência do Swagger.
export function authMiddleware(req: IAuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.split(' ')[1] : undefined;
  const token = bearer ?? req.cookies?.access_token;

  if (!token) return error(res, 'Token não fornecido', 401);

  try {
    const payload = verifyAccessToken(token);
    req.authKind = payload.kind;
    if (payload.kind === 'admin') {
      req.user = { id: payload.sub, email: payload.email, role: payload.role ?? Role.ADMIN };
    } else {
      req.client = { id: payload.sub, email: payload.email };
    }
    next();
  } catch {
    return error(res, 'Token inválido ou expirado', 401);
  }
}
