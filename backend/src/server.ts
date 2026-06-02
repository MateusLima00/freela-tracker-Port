import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import { logger } from './config/logger';
import { reminderService } from './services/reminder.service';

const DAY_MS = 86_400_000;

// Agenda a varredura diária de lembretes de parcela (Fase 8). Roda uma vez logo
// após o boot (com pequeno atraso) e depois a cada 24h. Erros são logados sem
// derrubar o servidor. `unref()` evita que o timer segure o processo.
function scheduleReminders() {
  const run = () => {
    reminderService.runDueReminders().catch((err) => logger.error(`[reminders] ${err}`));
  };
  setTimeout(run, 10_000).unref();
  setInterval(run, DAY_MS).unref();
}

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('[DB] Banco de dados conectado');

    app.listen(env.PORT, () => {
      logger.info(`[Server] Rodando em http://localhost:${env.PORT}`);
      logger.info(`[Docs]   http://localhost:${env.PORT}/api/docs`);
    });

    scheduleReminders();
  } catch (err) {
    logger.error(`[Error] Falha ao iniciar servidor: ${err}`);
    process.exit(1);
  }
}

bootstrap();
