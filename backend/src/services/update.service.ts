import { updateRepository } from '../repositories/update.repository';
import { projectRepository } from '../repositories/project.repository';
import { CreateUpdateDTO, UpdateProjectUpdateDTO } from '../dto/update.dto';

export const updateService = {
  async getByProject(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Projeto não encontrado');
    return updateRepository.findByProject(projectId);
  },

  async create(data: CreateUpdateDTO) {
    const project = await projectRepository.findById(data.projectId);
    if (!project) throw new Error('Projeto não encontrado');
    return updateRepository.create(data);
  },

  async update(id: string, data: UpdateProjectUpdateDTO) {
    const update = await updateRepository.findById(id);
    if (!update) throw new Error('Atualização não encontrada');
    return updateRepository.update(id, data);
  },

  async delete(id: string) {
    const update = await updateRepository.findById(id);
    if (!update) throw new Error('Atualização não encontrada');
    return updateRepository.delete(id);
  },
};
