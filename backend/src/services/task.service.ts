import { taskRepository } from '../repositories/task.repository';
import { projectRepository } from '../repositories/project.repository';
import { CreateTaskDTO, UpdateTaskDTO } from '../dto/task.dto';

export const taskService = {
  async getByProject(projectId: string) {
    return taskRepository.findByProject(projectId);
  },

  async create(data: CreateTaskDTO) {
    const project = await projectRepository.findById(data.projectId);
    if (!project) throw new Error('Projeto não encontrado');
    return taskRepository.create(data);
  },

  async update(id: string, data: UpdateTaskDTO) {
    const task = await taskRepository.findById(id);
    if (!task) throw new Error('Tarefa não encontrada');
    return taskRepository.update(id, data);
  },

  async delete(id: string) {
    const task = await taskRepository.findById(id);
    if (!task) throw new Error('Tarefa não encontrada');
    return taskRepository.delete(id);
  },
};
