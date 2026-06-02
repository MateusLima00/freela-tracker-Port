import { Role, ProjectStatus, TaskStatus, Priority } from '../enums';
import { Request } from 'express';

// ── Interfaces de domínio ────────────────────────────────────────────────────
// Servem como referência/documentação dos modelos. Os serviços retornam os tipos
// gerados pelo Prisma, que são mais precisos, mas estas interfaces documentam
// a forma pública esperada de cada entidade.

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  id: string;
  title: string;
  description?: string;
  progress: number;
  status: ProjectStatus;
  deadline?: Date;
  totalTime: number;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITimerSession {
  id: string;
  projectId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  isActive: boolean;
  note?: string;
  createdAt: Date;
}

export interface IProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Interfaces de autenticação ───────────────────────────────────────────────

// Tipo do sujeito autenticado: administrador (User) ou cliente (Client)
export type AuthKind = 'admin' | 'client';

// Permissões configuráveis por cliente (armazenadas em Client.permissions como Json)
export interface IClientPermissions {
  viewProgress: boolean;
  viewDeliveries: boolean;
  approveDeliveries: boolean;
  viewUpdates: boolean;
  viewPayments: boolean;
  receiveEmailOnDelivery: boolean;
  receiveEmailOnUpdate: boolean;
  receiveEmailOnPayment: boolean;
}

// Payload do access token (curta duração)
export interface AccessTokenPayload {
  sub: string; // id do User ou Client
  kind: AuthKind;
  email: string;
  role?: Role; // presente apenas para admin
}

// Payload do refresh token (longa duração) — jti permite rotação/revogação
export interface RefreshTokenPayload {
  sub: string;
  kind: AuthKind;
  jti: string;
}

// Dados do admin autenticado anexados em req.user (mantém compat. com controllers existentes)
export interface IAuthPayload {
  id: string;
  email: string;
  role: Role;
}

// Dados do cliente autenticado anexados em req.client
export interface IClientAuthPayload {
  id: string;
  email: string;
}

// Request com sujeito autenticado injetado pelo authMiddleware.
// Apenas um de `user`/`client` é preenchido, conforme o tipo do token.
export interface IAuthRequest extends Request {
  user?: IAuthPayload;
  client?: IClientAuthPayload;
  authKind?: AuthKind;
}
