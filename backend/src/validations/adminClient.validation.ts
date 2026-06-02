import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128)
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial');

// Permissões parciais — o service mescla com os defaults
const permissionsSchema = z
  .object({
    viewProgress: z.boolean(),
    viewDeliveries: z.boolean(),
    approveDeliveries: z.boolean(),
    viewUpdates: z.boolean(),
    viewPayments: z.boolean(),
    receiveEmailOnDelivery: z.boolean(),
    receiveEmailOnUpdate: z.boolean(),
    receiveEmailOnPayment: z.boolean(),
  })
  .partial();

export const createClientSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    firstName: z.string().min(1).max(60).optional(),
    lastName: z.string().min(1).max(60).optional(),
    email: z.string().email('Email inválido').max(254),
    password: passwordSchema,
    notes: z.string().max(2000).optional(),
    permissions: permissionsSchema.optional(),
    projectIds: z.array(z.string()).optional(),
  })
  .refine((d) => Boolean(d.name) || Boolean(d.firstName), {
    message: 'Informe o nome do cliente (name ou firstName)',
    path: ['name'],
  });

export const updateClientSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  email: z.string().email().max(254).optional(),
  notes: z.string().max(2000).optional(),
  permissions: permissionsSchema.optional(),
});
