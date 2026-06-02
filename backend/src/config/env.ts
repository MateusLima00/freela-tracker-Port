import 'dotenv/config';

// Validação na inicialização: o servidor não sobe com configuração inválida.
// Mantém compatibilidade com o JWT_SECRET legado (Fase 1) como fallback dos
// novos segredos de access/refresh, mas em produção devem ser distintos.

const legacySecret = process.env.JWT_SECRET;
const accessSecret = process.env.JWT_ACCESS_SECRET ?? legacySecret;
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? (legacySecret ? `${legacySecret}:refresh` : undefined);

if (!accessSecret) {
  throw new Error('JWT_ACCESS_SECRET (ou JWT_SECRET legado) é obrigatório. Defina no .env.');
}
if (!refreshSecret) {
  throw new Error('JWT_REFRESH_SECRET é obrigatório. Defina no .env.');
}
if (accessSecret === refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET devem ser diferentes.');
}

const bcryptRounds = Number(process.env.BCRYPT_ROUNDS) || 12;
if (bcryptRounds < 10 || bcryptRounds > 14) {
  throw new Error('BCRYPT_ROUNDS deve estar entre 10 e 14.');
}

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: accessSecret,
  JWT_REFRESH_SECRET: refreshSecret,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  BCRYPT_ROUNDS: bcryptRounds,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // E-mail (Fase 8) — opcionais; ausência ativa o modo stub
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'FreelaTracker <no-reply@freelatracker.app>',
  // Storage de imagens (Fase 7) — se CLOUDINARY_URL estiver setado, usa Cloudinary;
  // caso contrário, grava localmente em backend/uploads.
  CLOUDINARY_URL: process.env.CLOUDINARY_URL || '',
};
