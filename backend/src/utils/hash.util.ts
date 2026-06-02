import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { env } from '../config/env';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

// Hash determinístico (SHA-256) usado para guardar refresh tokens no banco.
// Não usar para senhas — apenas para tokens de alta entropia já aleatórios.
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
