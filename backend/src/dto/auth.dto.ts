import { Role } from '../enums';
import { AuthKind, IClientPermissions } from '../interfaces';

export interface LoginDTO {
  email: string;
  password: string;
}

// Registro é exclusivo de admin (o freelancer dono da conta)
export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// Metadados da requisição usados para auditar sessões (refresh tokens)
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

// Sujeito autenticado normalizado, usado para emitir tokens
export interface AuthSubject {
  kind: AuthKind;
  id: string;
  email: string;
  role?: Role;
}

export interface AdminPrincipal {
  id: string;
  name: string;
  email: string;
  role: string;
  kind: 'admin';
}

export interface ClientPrincipal {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // firstName + ' ' + lastName (conveniência p/ a UI)
  email: string;
  mustChangePassword: boolean;
  permissions: IClientPermissions; // o portal usa para mostrar/ocultar seções
  kind: 'client';
}

export type Principal = AdminPrincipal | ClientPrincipal;

// Resultado de login/refresh: tokens + dados do principal.
// O accessToken vai no body; o refreshToken é setado em cookie httpOnly pelo controller.
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  principal: Principal;
}
