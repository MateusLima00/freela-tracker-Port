import { Resend } from 'resend';
import prisma from '../config/database';
import { env } from '../config/env';
import { emailLogRepository } from '../repositories/emailLog.repository';
import { projectRepository } from '../repositories/project.repository';
import { emailTemplates, EmailContent } from '../utils/emailTemplates.util';
import { normalizePermissions } from '../utils/permissions.util';
import { IClientPermissions } from '../interfaces';

// Cliente Resend só é instanciado quando há chave. Sem chave, o serviço opera em
// modo *stub*: loga no console e registra o EmailLog como SENT, sem chamar a rede.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// URL pública do portal (primeira origem do CORS) para os links dos e-mails.
const loginUrl = `${env.CORS_ORIGIN.split(',')[0].trim()}/login`;

// Cliente mínimo necessário para checar permissões e destinatário.
interface ClientLike {
  email: string;
  firstName: string;
  permissions: unknown;
}

// Envio central: nunca lança e nunca bloqueia o fluxo HTTP (fire-and-forget).
// Registra cada tentativa no EmailLog (SENT no stub/sucesso, FAILED no erro).
async function send(
  to: string,
  content: EmailContent,
  event: string,
  projectId?: string | null,
): Promise<void> {
  try {
    if (!resend) {
      // Modo stub — útil em dev/sem credenciais.
      console.log(`[email:stub] → ${to} | ${event} | ${content.subject}`);
    } else {
      const { error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to,
        subject: content.subject,
        html: content.html,
      });
      if (error) throw new Error(error.message);
    }

    await emailLogRepository.create({
      projectId, to, subject: content.subject, body: content.html, event, status: 'SENT',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido ao enviar e-mail';
    console.error(`[email:error] → ${to} | ${event}: ${message}`);
    // Best-effort: registra a falha sem propagar o erro ao chamador.
    await emailLogRepository
      .create({ projectId, to, subject: content.subject, body: content.html, event, status: 'FAILED', error: message })
      .catch(() => { /* log falhou — nada a fazer */ });
  }
}

// E-mail do admin (destinatário das notificações de aprovação/reprovação/parcela
// vencida). Há um único admin no sistema; pega o primeiro.
async function getAdminEmail(): Promise<string | null> {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { email: true } });
  return admin?.email ?? null;
}

// Dispara sem await — o chamador não espera o envio. `.catch` evita unhandled
// rejection caso algo escape do try/catch interno.
function fireAndForget(promise: Promise<void>): void {
  promise.catch((err) => console.error('[email:unhandled]', err));
}

export const emailService = {
  // ── Boas-vindas ao criar cliente (Fase 3 → Fase 8) ──────────────────────────
  welcome(client: { email: string; firstName: string }, tempPassword: string): void {
    const content = emailTemplates.welcome(client.firstName, client.email, tempPassword, loginUrl);
    fireAndForget(send(client.email, content, 'client.welcome', null));
  },

  // ── Entregas ────────────────────────────────────────────────────────────────
  // Cliente recebe quando uma nova entrega é criada (se receiveEmailOnDelivery).
  deliveryCreated(client: ClientLike, projectId: string, projectTitle: string, deliveryTitle: string): void {
    const perms = normalizePermissions(client.permissions);
    if (!perms.receiveEmailOnDelivery) return;
    const content = emailTemplates.deliveryCreated(projectTitle, deliveryTitle, loginUrl);
    fireAndForget(send(client.email, content, 'delivery.created', projectId));
  },

  // Admin recebe quando o cliente aprova.
  deliveryApproved(projectId: string, projectTitle: string, deliveryTitle: string): void {
    fireAndForget(
      getAdminEmail().then((to) => {
        if (!to) return;
        return send(to, emailTemplates.deliveryApproved(projectTitle, deliveryTitle), 'delivery.approved', projectId);
      }),
    );
  },

  // Admin recebe quando o cliente reprova (com o feedback).
  deliveryRejected(projectId: string, projectTitle: string, deliveryTitle: string, feedback: string): void {
    fireAndForget(
      getAdminEmail().then((to) => {
        if (!to) return;
        return send(to, emailTemplates.deliveryRejected(projectTitle, deliveryTitle, feedback), 'delivery.rejected', projectId);
      }),
    );
  },

  // ── Atualização de status do projeto ────────────────────────────────────────
  statusUpdate(client: ClientLike, projectId: string, projectTitle: string, statusLabel: string): void {
    const perms = normalizePermissions(client.permissions);
    if (!perms.receiveEmailOnUpdate) return;
    const content = emailTemplates.statusUpdate(projectTitle, statusLabel, loginUrl);
    fireAndForget(send(client.email, content, 'project.statusUpdate', projectId));
  },

  // ── Pagamentos ────────────────────────────────────────────────────────────────
  // O `event` carrega o id da parcela para permitir deduplicação por parcela
  // (ver reminder.service): "installment.dueSoon:<id>".
  installmentDueSoon(client: ClientLike, installmentId: string, projectId: string, projectTitle: string, value: string, dueDate: string): void {
    const perms = normalizePermissions(client.permissions);
    if (!perms.receiveEmailOnPayment) return;
    const content = emailTemplates.installmentDueSoon(projectTitle, value, dueDate, loginUrl);
    fireAndForget(send(client.email, content, `installment.dueSoon:${installmentId}`, projectId));
  },

  installmentOverdue(installmentId: string, projectId: string, projectTitle: string, value: string, dueDate: string): void {
    fireAndForget(
      getAdminEmail().then((to) => {
        if (!to) return;
        return send(to, emailTemplates.installmentOverdue(projectTitle, value, dueDate), `installment.overdue:${installmentId}`, projectId);
      }),
    );
  },

  // ── E-mail manual escrito pelo admin ──────────────────────────────────────────
  // Aqui o envio é aguardado (não fire-and-forget) para que a rota possa reportar
  // sucesso/falha ao admin que escreveu o e-mail.
  async sendManual(to: string, projectId: string, projectTitle: string, subject: string, message: string): Promise<void> {
    await send(to, emailTemplates.manual(projectTitle, subject, message), 'project.manual', projectId);
  },

  // Orquestra o envio manual a partir do projeto: resolve o cliente vinculado,
  // valida e devolve o histórico atualizado de e-mails do projeto.
  async sendProjectEmail(projectId: string, subject: string, message: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Projeto não encontrado');
    if (!project.clientId || !project.client?.email) {
      throw new Error('Projeto não tem cliente com e-mail vinculado');
    }
    await this.sendManual(project.client.email, projectId, project.title, subject, message);
    return emailLogRepository.findByProject(projectId);
  },

  // Histórico de e-mails do projeto (admin).
  async listByProject(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new Error('Projeto não encontrado');
    return emailLogRepository.findByProject(projectId);
  },

  // Permissões normalizadas — reexport útil para serviços que precisam checar
  // flags antes de chamar (ex.: status update).
  normalize(permissions: unknown): IClientPermissions {
    return normalizePermissions(permissions);
  },
};
