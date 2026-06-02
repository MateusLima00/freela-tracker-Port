import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/env';

const isProd = env.NODE_ENV === 'production';

export const helmetMiddleware = helmet({
  // CSP restritiva: sem inline scripts, sem objetos, sem enquadramento. styleSrc
  // mantém 'unsafe-inline' por causa dos estilos inline do Swagger UI/React.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      // força HTTPS apenas em produção
      ...(isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  // Permite que as imagens de /api/uploads sejam carregadas pelo front (cross-origin em dev).
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
