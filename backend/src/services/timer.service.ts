import { timerRepository } from '../repositories/timer.repository';
import { projectRepository } from '../repositories/project.repository';
import { updateRepository } from '../repositories/update.repository';
import { StartTimerDTO } from '../dto/timer.dto';
import { diffInSeconds, secondsToHHMMSS } from '../utils/time.util';

// Tempo ativo total de uma sessão agora = acumulado + segmento corrente (se rodando)
function currentActiveSeconds(session: {
  accumulatedSeconds: number;
  isPaused: boolean;
  lastResumeAt: Date | null;
}): number {
  if (session.isPaused || !session.lastResumeAt) return session.accumulatedSeconds;
  return session.accumulatedSeconds + diffInSeconds(session.lastResumeAt, new Date());
}

export const timerService = {
  async start(userId: string, data: StartTimerDTO) {
    const project = await projectRepository.findById(data.projectId);
    if (!project) throw new Error('Projeto não encontrado');

    const active = await timerRepository.findActiveByUser(userId);
    if (active) throw new Error('Já existe um timer ativo. Pare o timer atual primeiro.');

    return timerRepository.create({
      projectId: data.projectId,
      userId,
      startTime: new Date(),
      note: data.note,
    });
  },

  async pause(sessionId: string, userId: string) {
    const session = await timerRepository.findById(sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.userId !== userId) throw new Error('Sem permissão');
    if (!session.isActive) throw new Error('Timer já foi parado');
    if (session.isPaused) throw new Error('Timer já está pausado');

    return timerRepository.pause(sessionId, currentActiveSeconds(session));
  },

  async resume(sessionId: string, userId: string) {
    const session = await timerRepository.findById(sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.userId !== userId) throw new Error('Sem permissão');
    if (!session.isActive) throw new Error('Timer já foi parado');
    if (!session.isPaused) throw new Error('Timer não está pausado');

    return timerRepository.resume(sessionId, new Date());
  },

  // Para o timer: registra a duração ATIVA, acumula no projeto e cria um
  // ProjectUpdate com a nota da sessão (entra no feed de atualizações).
  async stop(sessionId: string, userId: string, note: string) {
    const session = await timerRepository.findById(sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.userId !== userId) throw new Error('Sem permissão');
    if (!session.isActive) throw new Error('Timer já foi parado');

    const endTime = new Date();
    const duration = currentActiveSeconds(session);

    const [stopped] = await Promise.all([
      timerRepository.stop(sessionId, endTime, duration, note),
      projectRepository.addTime(session.projectId, duration),
      updateRepository.create({
        projectId: session.projectId,
        title: `Sessão de trabalho · ${secondsToHHMMSS(duration)}`,
        content: note,
        type: 'TIMER',
      }),
    ]);

    return stopped;
  },

  async getByProject(projectId: string) {
    return timerRepository.findByProject(projectId);
  },

  async getActive(userId: string) {
    return timerRepository.findActiveByUser(userId);
  },
};
