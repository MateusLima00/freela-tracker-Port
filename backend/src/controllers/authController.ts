import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { success, error } from '../utils/response.util';
import { IAuthRequest } from '../interfaces';
import { RequestContext } from '../dto/auth.dto';
import { env } from '../config/env';

const REFRESH_COOKIE = 'refresh_token';

// Cookie httpOnly com escopo nas rotas de auth — o refresh token nunca é
// acessível via JavaScript nem enviado em requisições de API comuns.
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

function ctxFrom(req: Request): RequestContext {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions);
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

// Resposta de erro de login: 429 com a mensagem quando há bloqueio por excesso
// de tentativas; caso contrário, mensagem genérica (não revela se o e-mail existe).
function loginError(res: Response, err: unknown) {
  const message = err instanceof Error ? err.message : '';
  if (message.startsWith('Muitas tentativas')) return error(res, message, 429);
  return error(res, 'Credenciais inválidas', 401);
}

export const authController = {
  // Registro de admin (o freelancer dono da conta)
  async register(req: Request, res: Response) {
    try {
      const result = await authService.registerAdmin(req.body, ctxFrom(req));
      setRefreshCookie(res, result.refreshToken);
      return success(res, { accessToken: result.accessToken, user: result.principal }, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar';
      return error(res, message, 400);
    }
  },

  async login(req: Request, res: Response) {
    try {
      const result = await authService.loginAdmin(req.body, ctxFrom(req));
      setRefreshCookie(res, result.refreshToken);
      return success(res, { accessToken: result.accessToken, user: result.principal });
    } catch (err) {
      return loginError(res, err);
    }
  },

  async clientLogin(req: Request, res: Response) {
    try {
      const result = await authService.loginClient(req.body, ctxFrom(req));
      setRefreshCookie(res, result.refreshToken);
      return success(res, { accessToken: result.accessToken, user: result.principal });
    } catch (err) {
      return loginError(res, err);
    }
  },

  // Rotaciona o refresh token do cookie e devolve um novo access token
  async refresh(req: Request, res: Response) {
    try {
      const token = req.cookies?.[REFRESH_COOKIE];
      if (!token) return error(res, 'Sessão inválida', 401);
      const result = await authService.refresh(token, ctxFrom(req));
      setRefreshCookie(res, result.refreshToken);
      return success(res, { accessToken: result.accessToken, user: result.principal });
    } catch {
      clearRefreshCookie(res);
      return error(res, 'Sessão inválida', 401);
    }
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]).catch(() => null);
    clearRefreshCookie(res);
    return success(res, { message: 'Logout realizado com sucesso' });
  },

  async logoutAll(req: IAuthRequest, res: Response) {
    try {
      if (req.user) await authService.logoutAll('admin', req.user.id);
      else if (req.client) await authService.logoutAll('client', req.client.id);
      clearRefreshCookie(res);
      return success(res, { message: 'Todas as sessões foram encerradas' });
    } catch (err: unknown) {
      return error(res, err instanceof Error ? err.message : 'Erro interno', 500);
    }
  },

  async me(req: IAuthRequest, res: Response) {
    try {
      const principal = req.authKind === 'client'
        ? await authService.meClient(req.client!.id)
        : await authService.meAdmin(req.user!.id);
      return success(res, principal);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não encontrado';
      return error(res, message, 404);
    }
  },

  // Troca de senha do cliente (também usada no 1º acesso obrigatório).
  // Após a troca todas as sessões são revogadas → o cliente faz login de novo.
  async changeClientPassword(req: IAuthRequest, res: Response) {
    try {
      await authService.changeClientPassword(req.client!.id, req.body);
      clearRefreshCookie(res);
      return success(res, { message: 'Senha alterada com sucesso' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao alterar senha';
      const status = message === 'Senha atual incorreta' ? 400 : 400;
      return error(res, message, status);
    }
  },
};
