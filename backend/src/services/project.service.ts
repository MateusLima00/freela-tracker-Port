import { projectRepository } from '../repositories/project.repository';
import { CreateProjectDTO, UpdateProjectDTO } from '../dto/project.dto';
import { clientRepository } from '../repositories/client.repository';
import { emailService } from './email.service';

// Rótulos amigáveis de status para os e-mails de atualização (sem jargão técnico).
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  AWAITING_CLIENT: 'Aguardando cliente',
  COMPLETED: 'Concluído',
  PAUSED: 'Pausado',
  ARCHIVED: 'Arquivado',
};

// Acrescenta o campo derivado `name` (firstName + lastName) ao cliente do projeto,
// mantendo a forma esperada pela UI admin sem expor a estrutura interna do Client.
function withClientName<T extends { client?: { firstName: string; lastName: string } | null }>(project: T) {
  if (!project.client) return project;
  return {
    ...project,
    client: { ...project.client, name: `${project.client.firstName} ${project.client.lastName}`.trim() },
  };
}

export const projectService = {
  async getAll() {
    const projects = await projectRepository.findAll();
    return projects.map(withClientName);
  },

  async getById(id: string) {
    const project = await projectRepository.findById(id);
    if (!project) throw new Error('Projeto não encontrado');
    return withClientName(project);
  },

  async create(data: CreateProjectDTO) {
    if (data.clientId) {
      const client = await clientRepository.findById(data.clientId);
      if (!client) throw new Error('Cliente não encontrado');
    }
    return projectRepository.create(data);
  },

  async update(id: string, data: UpdateProjectDTO) {
    const project = await projectRepository.findById(id);
    if (!project) throw new Error('Projeto não encontrado');

    const updated = await projectRepository.update(id, data);

    // Notifica o cliente quando o status muda (respeita receiveEmailOnUpdate).
    const statusChanged = data.status !== undefined && data.status !== project.status;
    if (statusChanged && project.clientId) {
      const client = await clientRepository.findById(project.clientId);
      if (client) {
        const label = STATUS_LABELS[updated.status] ?? updated.status;
        emailService.statusUpdate(client, id, project.title, label);
      }
    }
    return updated;
  },

  async delete(id: string) {
    const project = await projectRepository.findById(id);
    if (!project) throw new Error('Projeto não encontrado');
    // Tasks, TimerSessions e Updates são removidos por cascade no schema Prisma
    return projectRepository.delete(id);
  },
};
