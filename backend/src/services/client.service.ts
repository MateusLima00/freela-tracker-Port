import { projectRepository } from '../repositories/project.repository';
import { updateRepository } from '../repositories/update.repository';
import { clientRepository } from '../repositories/client.repository';
import { installmentService } from './installment.service';
import { normalizePermissions } from '../utils/permissions.util';

// Carrega as permissões normalizadas do cliente autenticado
async function getPermissions(clientId: string) {
  const client = await clientRepository.findById(clientId);
  if (!client) throw new Error('Projeto não encontrado');
  return normalizePermissions(client.permissions);
}

export const clientService = {
  // Lista projetos do cliente — oculta updates se a permissão viewUpdates estiver off
  async getMyProjects(clientId: string) {
    const permissions = await getPermissions(clientId);
    const projects = await projectRepository.findByClientId(clientId);
    if (permissions.viewUpdates) return projects;
    return projects.map((p) => ({ ...p, updates: [] }));
  },

  // Busca um projeto específico do cliente — usa findByIdForClient para
  // não expor timerSessions (dados internos de horas/billing)
  async getMyProject(clientId: string, projectId: string) {
    const permissions = await getPermissions(clientId);
    const project = await projectRepository.findByIdForClient(projectId);
    // Mesmo erro para "não existe" e "é de outro cliente" — evita enumeração
    if (!project || project.clientId !== clientId) throw new Error('Projeto não encontrado');
    // Não vaza updates quando o cliente não tem permissão de vê-los
    if (!permissions.viewUpdates) return { ...project, updates: [] };
    return project;
  },

  // Retorna updates de progresso — respeita a permissão viewUpdates do cliente
  async getProjectUpdates(clientId: string, projectId: string) {
    const permissions = await getPermissions(clientId);
    if (!permissions.viewUpdates) throw new Error('Acesso não permitido');

    const project = await projectRepository.findByIdForClient(projectId);
    if (!project || project.clientId !== clientId) throw new Error('Projeto não encontrado');
    return updateRepository.findByProject(projectId);
  },

  // Resumo financeiro — respeita a permissão viewPayments e a posse do projeto
  async getFinancial(clientId: string, projectId: string) {
    const client = await clientRepository.findById(clientId);
    if (!client) throw new Error('Projeto não encontrado');

    const permissions = normalizePermissions(client.permissions);
    if (!permissions.viewPayments) throw new Error('Acesso não permitido');

    const project = await projectRepository.findByIdForClient(projectId);
    if (!project || project.clientId !== clientId) throw new Error('Projeto não encontrado');

    return installmentService.getClientFinancial(projectId);
  },
};
