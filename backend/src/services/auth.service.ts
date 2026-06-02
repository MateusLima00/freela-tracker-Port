import { randomUUID } from 'crypto';
import { userRepository } from '../repositories/user.repository';
import { clientRepository } from '../repositories/client.repository';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import {
  LoginDTO,
  RegisterDTO,
  ChangePasswordDTO,
  RequestContext,
  AuthSubject,
  AuthResult,
  Principal,
} from '../dto/auth.dto';
import { hashPassword, comparePassword, sha256 } from '../utils/hash.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { normalizePermissions } from '../utils/permissions.util';
import { loginAttemptRepository } from '../repositories/loginAttempt.repository';
import { auditService } from './audit.service';
import { env } from '../config/env';
import { Role } from '../enums';

// Bloqueio progressivo: após MAX_FAILURES falhas na janela, novas tentativas são
// recusadas (mesmo com a senha correta) até a janela expirar.
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCKED_MESSAGE = 'Muitas tentativas. Tente novamente em alguns minutos.';

async function assertNotLocked(identifier: string): Promise<void> {
  const since = new Date(Date.now() - LOCK_WINDOW_MS);
  const failures = await loginAttemptRepository.countRecentFailures(identifier, since);
  if (failures >= MAX_FAILURES) throw new Error(LOCKED_MESSAGE);
}

// Hash bcrypt fixo usado para equalizar o tempo de resposta quando o e-mail não
// existe — evita enumeração de contas por timing attack.
const DUMMY_HASH = '$2a$12$RKXjTJvWZ5hd/uRHlvKN/uyfjU3Y7VRbdpf6onpgyOO.fwgpKC1im';

// Converte durações simples ('15m', '7d', '12h', '30s') em milissegundos.
function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback 7d
  const amount = Number(match[1]);
  const unit = match[2];
  const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return amount * factor;
}

function clientPrincipal(c: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mustChangePassword: boolean;
  permissions: unknown;
}): Principal {
  return {
    kind: 'client',
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    name: `${c.firstName} ${c.lastName}`.trim(),
    email: c.email,
    mustChangePassword: c.mustChangePassword,
    permissions: normalizePermissions(c.permissions),
  };
}

function adminPrincipal(u: { id: string; name: string; email: string; role: string }): Principal {
  return { kind: 'admin', id: u.id, name: u.name, email: u.email, role: u.role };
}

export const authService = {
  // Emite par access+refresh e persiste o hash do refresh para permitir revogação.
  async issueTokens(subject: AuthSubject, ctx: RequestContext): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = signAccessToken({
      sub: subject.id,
      kind: subject.kind,
      email: subject.email,
      role: subject.role,
    });

    const jti = randomUUID();
    const refreshToken = signRefreshToken({ sub: subject.id, kind: subject.kind, jti });

    await refreshTokenRepository.create({
      tokenHash: sha256(refreshToken),
      userId: subject.kind === 'admin' ? subject.id : undefined,
      clientId: subject.kind === 'client' ? subject.id : undefined,
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES)),
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { accessToken, refreshToken };
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  async registerAdmin(data: RegisterDTO, ctx: RequestContext): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new Error('Email já está em uso');

    const password = await hashPassword(data.password);
    const user = await userRepository.create({ name: data.name, email: data.email, password });

    const tokens = await this.issueTokens(
      { kind: 'admin', id: user.id, email: user.email, role: user.role as Role },
      ctx,
    );
    return { ...tokens, principal: adminPrincipal(user) };
  },

  async loginAdmin(data: LoginDTO, ctx: RequestContext): Promise<AuthResult> {
    await assertNotLocked(data.email);

    const user = await userRepository.findByEmail(data.email);
    // Compara sempre (dummy se não existir) para tempo de resposta constante
    const valid = await comparePassword(data.password, user?.password ?? DUMMY_HASH);
    if (!user || !valid) {
      await loginAttemptRepository.create(data.email, ctx.ipAddress, false);
      auditService.record({ actorType: 'system', action: 'auth.login.fail', ipAddress: ctx.ipAddress, metadata: { email: data.email, kind: 'admin' } });
      throw new Error('Credenciais inválidas');
    }

    await loginAttemptRepository.create(data.email, ctx.ipAddress, true);
    await loginAttemptRepository.clearFailures(data.email);
    auditService.record({ actorType: 'admin', actorId: user.id, action: 'auth.login', ipAddress: ctx.ipAddress });

    const tokens = await this.issueTokens(
      { kind: 'admin', id: user.id, email: user.email, role: user.role as Role },
      ctx,
    );
    return { ...tokens, principal: adminPrincipal(user) };
  },

  // ── Cliente ──────────────────────────────────────────────────────────────
  async loginClient(data: LoginDTO, ctx: RequestContext): Promise<AuthResult> {
    await assertNotLocked(data.email);

    const client = await clientRepository.findByEmail(data.email);
    const valid = await comparePassword(data.password, client?.passwordHash ?? DUMMY_HASH);
    if (!client || !valid) {
      await loginAttemptRepository.create(data.email, ctx.ipAddress, false);
      auditService.record({ actorType: 'system', action: 'auth.login.fail', ipAddress: ctx.ipAddress, metadata: { email: data.email, kind: 'client' } });
      throw new Error('Credenciais inválidas');
    }

    await loginAttemptRepository.create(data.email, ctx.ipAddress, true);
    await loginAttemptRepository.clearFailures(data.email);
    auditService.record({ actorType: 'client', actorId: client.id, action: 'auth.login', ipAddress: ctx.ipAddress });

    const tokens = await this.issueTokens(
      { kind: 'client', id: client.id, email: client.email },
      ctx,
    );
    return { ...tokens, principal: clientPrincipal(client) };
  },

  // ── Refresh com rotação ────────────────────────────────────────────────────
  // Verifica assinatura + existência ativa no banco, revoga o antigo e emite novo par.
  async refresh(refreshToken: string, ctx: RequestContext): Promise<AuthResult> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new Error('Sessão inválida');
    }

    const stored = await refreshTokenRepository.findActiveByHash(sha256(refreshToken));
    if (!stored) throw new Error('Sessão inválida');

    // Rotação: o token usado é revogado imediatamente
    await refreshTokenRepository.revokeById(stored.id);

    if (payload.kind === 'admin') {
      const user = await userRepository.findById(payload.sub);
      if (!user) throw new Error('Sessão inválida');
      const tokens = await this.issueTokens(
        { kind: 'admin', id: user.id, email: user.email, role: user.role as Role },
        ctx,
      );
      return { ...tokens, principal: adminPrincipal(user) };
    }

    const client = await clientRepository.findById(payload.sub);
    if (!client) throw new Error('Sessão inválida');
    const tokens = await this.issueTokens(
      { kind: 'client', id: client.id, email: client.email },
      ctx,
    );
    return { ...tokens, principal: clientPrincipal(client) };
  },

  // Revoga o refresh token atual (logout de uma sessão)
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const stored = await refreshTokenRepository.findActiveByHash(sha256(refreshToken));
    if (stored) await refreshTokenRepository.revokeById(stored.id);
  },

  // Revoga todas as sessões do sujeito (logout em todos os dispositivos)
  async logoutAll(kind: 'admin' | 'client', id: string): Promise<void> {
    if (kind === 'admin') await refreshTokenRepository.revokeAllForUser(id);
    else await refreshTokenRepository.revokeAllForClient(id);
  },

  // ── /me ────────────────────────────────────────────────────────────────────
  async meAdmin(id: string): Promise<Principal> {
    const user = await userRepository.findById(id);
    if (!user) throw new Error('Usuário não encontrado');
    return adminPrincipal(user);
  },

  async meClient(id: string): Promise<Principal> {
    const client = await clientRepository.findById(id);
    if (!client) throw new Error('Cliente não encontrado');
    return clientPrincipal(client);
  },

  // ── Troca de senha do cliente ────────────────────────────────────────────────
  // Valida a senha atual, atualiza o hash, desliga mustChangePassword e revoga
  // todas as sessões (força novo login — também usado no 1º acesso).
  async changeClientPassword(clientId: string, data: ChangePasswordDTO): Promise<void> {
    const client = await clientRepository.findById(clientId);
    if (!client) throw new Error('Cliente não encontrado');

    const valid = await comparePassword(data.currentPassword, client.passwordHash);
    if (!valid) throw new Error('Senha atual incorreta');

    const passwordHash = await hashPassword(data.newPassword);
    await clientRepository.updatePassword(clientId, passwordHash);
    await refreshTokenRepository.revokeAllForClient(clientId);
  },
};
