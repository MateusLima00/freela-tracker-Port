import { UpdateType } from '@prisma/client';

export interface CreateUpdateDTO {
  projectId: string;
  title: string;
  content: string;
  type?: UpdateType; // padrão GENERAL no banco
}

export interface UpdateProjectUpdateDTO {
  title?: string;
  content?: string;
}
