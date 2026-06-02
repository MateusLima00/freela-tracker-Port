import winston from 'winston';
import { env } from './env';

// Logger estruturado central (segurança/observabilidade). Em produção emite JSON
// (fácil de ingerir em coletores); em dev usa formato colorido e legível.
const isProd = env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${extra}`;
        }),
      ),
  transports: [new winston.transports.Console()],
});

// Stream compatível com o morgan (encaminha o log HTTP para o Winston).
export const morganStream = {
  write: (message: string) => logger.http?.(message.trim()) ?? logger.info(message.trim()),
};
