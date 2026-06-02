import { IClientPermissions } from '../interfaces';

// Permissões padrão de um cliente recém-criado: vê progresso/entregas/updates e
// pode aprovar entregas; pagamentos ocultos por padrão. E-mails transacionais ON.
export const DEFAULT_CLIENT_PERMISSIONS: IClientPermissions = {
  viewProgress: true,
  viewDeliveries: true,
  approveDeliveries: true,
  viewUpdates: true,
  viewPayments: false,
  receiveEmailOnDelivery: true,
  receiveEmailOnUpdate: false,
  receiveEmailOnPayment: true,
};

// Normaliza um objeto de permissões parcial (vindo do banco como Json ou do body)
// preenchendo qualquer flag ausente com o padrão. Evita undefined no portal.
export function normalizePermissions(input: unknown): IClientPermissions {
  const partial = (input ?? {}) as Partial<IClientPermissions>;
  return { ...DEFAULT_CLIENT_PERMISSIONS, ...partial };
}
