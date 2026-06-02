import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks de módulos (hoisted pelo vitest) ───────────────────────────────────
vi.mock('../../repositories/user.repository', () => ({
  userRepository: { findByEmail: vi.fn(), findById: vi.fn(), create: vi.fn() },
}));
vi.mock('../../repositories/client.repository', () => ({
  clientRepository: { findById: vi.fn(), findByEmail: vi.fn(), updatePassword: vi.fn() },
}));
vi.mock('../../repositories/refreshToken.repository', () => ({
  refreshTokenRepository: {
    create: vi.fn(),
    revokeAllForClient: vi.fn(),
    revokeAllForUser: vi.fn(),
    findActiveByHash: vi.fn(),
    revokeById: vi.fn(),
  },
}));
vi.mock('../../repositories/loginAttempt.repository', () => ({
  loginAttemptRepository: {
    countRecentFailures: vi.fn(),
    create: vi.fn(),
    clearFailures: vi.fn(),
  },
}));
vi.mock('../../utils/hash.util', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  sha256: vi.fn(() => 'hashed-token'),
}));
vi.mock('../../utils/jwt.util', () => ({
  signAccessToken: vi.fn(() => 'access-token'),
  signRefreshToken: vi.fn(() => 'refresh-token'),
  verifyRefreshToken: vi.fn(),
}));
// Evita a validação de env (que lança sem JWT_*_SECRET definidos no ambiente).
vi.mock('../../config/env', () => ({
  env: { JWT_REFRESH_EXPIRES: '7d', JWT_ACCESS_EXPIRES: '15m' },
}));
vi.mock('../audit.service', () => ({
  auditService: { record: vi.fn() },
}));

import { authService } from '../auth.service';
import { userRepository } from '../../repositories/user.repository';
import { clientRepository } from '../../repositories/client.repository';
import { refreshTokenRepository } from '../../repositories/refreshToken.repository';
import { loginAttemptRepository } from '../../repositories/loginAttempt.repository';
import { hashPassword, comparePassword } from '../../utils/hash.util';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.util';

const ctx = { ipAddress: '127.0.0.1', userAgent: 'vitest' };

beforeEach(() => {
  vi.clearAllMocks();
  // padrão "feliz" — cada teste sobrescreve o que precisa
  (loginAttemptRepository.countRecentFailures as any).mockResolvedValue(0);
  (loginAttemptRepository.create as any).mockResolvedValue(undefined);
  (loginAttemptRepository.clearFailures as any).mockResolvedValue(undefined);
  (refreshTokenRepository.create as any).mockResolvedValue(undefined);
  (refreshTokenRepository.revokeAllForClient as any).mockResolvedValue(undefined);
  (signAccessToken as any).mockReturnValue('access-token');
  (signRefreshToken as any).mockReturnValue('refresh-token');
});

describe('authService.loginAdmin', () => {
  const credentials = { email: 'admin@freela.dev', password: 'segredo123' };

  it('lança erro de bloqueio quando há 5+ falhas recentes', async () => {
    (loginAttemptRepository.countRecentFailures as any).mockResolvedValue(5);

    await expect(authService.loginAdmin(credentials, ctx)).rejects.toThrow(
      'Muitas tentativas. Tente novamente em alguns minutos.',
    );
    // não deve sequer consultar o usuário quando bloqueado
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('lança erro genérico quando o usuário não existe (sem revelar o motivo)', async () => {
    (userRepository.findByEmail as any).mockResolvedValue(null);
    (comparePassword as any).mockResolvedValue(false);

    await expect(authService.loginAdmin(credentials, ctx)).rejects.toThrow('Credenciais inválidas');
    expect(loginAttemptRepository.create).toHaveBeenCalledWith(credentials.email, ctx.ipAddress, false);
  });

  it('lança erro genérico quando a senha está incorreta', async () => {
    (userRepository.findByEmail as any).mockResolvedValue({
      id: 'u1', name: 'Admin', email: credentials.email, role: 'ADMIN', password: 'hash',
    });
    (comparePassword as any).mockResolvedValue(false);

    await expect(authService.loginAdmin(credentials, ctx)).rejects.toThrow('Credenciais inválidas');
    expect(loginAttemptRepository.create).toHaveBeenCalledWith(credentials.email, ctx.ipAddress, false);
  });

  it('retorna accessToken, refreshToken e principal em caso de sucesso', async () => {
    (userRepository.findByEmail as any).mockResolvedValue({
      id: 'u1', name: 'Admin', email: credentials.email, role: 'ADMIN', password: 'hash',
    });
    (comparePassword as any).mockResolvedValue(true);

    const result = await authService.loginAdmin(credentials, ctx);

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      principal: { kind: 'admin', id: 'u1', name: 'Admin', email: credentials.email, role: 'ADMIN' },
    });
    expect(loginAttemptRepository.create).toHaveBeenCalledWith(credentials.email, ctx.ipAddress, true);
    expect(loginAttemptRepository.clearFailures).toHaveBeenCalledWith(credentials.email);
  });
});

describe('authService.changeClientPassword', () => {
  const data = { currentPassword: 'atual123', newPassword: 'nova456' };
  const client = {
    id: 'c1', firstName: 'Ana', lastName: 'Silva', email: 'ana@cliente.dev',
    passwordHash: 'old-hash', mustChangePassword: false, permissions: {},
  };

  it("lança 'Senha atual incorreta' quando a senha atual não confere", async () => {
    (clientRepository.findById as any).mockResolvedValue(client);
    (comparePassword as any).mockResolvedValue(false);

    await expect(authService.changeClientPassword('c1', data)).rejects.toThrow('Senha atual incorreta');
    expect(clientRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('atualiza a senha e revoga as sessões em caso de sucesso', async () => {
    (clientRepository.findById as any).mockResolvedValue(client);
    (comparePassword as any).mockResolvedValue(true);
    (hashPassword as any).mockResolvedValue('new-hash');
    (clientRepository.updatePassword as any).mockResolvedValue(undefined);

    await authService.changeClientPassword('c1', data);

    expect(clientRepository.updatePassword).toHaveBeenCalledWith('c1', 'new-hash');
    expect(refreshTokenRepository.revokeAllForClient).toHaveBeenCalledWith('c1');
  });
});
