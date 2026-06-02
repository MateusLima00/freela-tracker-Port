import morgan from 'morgan';
import { env } from '../config/env';
import { morganStream } from '../config/logger';

// HTTP logging encaminhado ao Winston (logs estruturados e centralizados).
export const loggerMiddleware = morgan(
  env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream: morganStream },
);
