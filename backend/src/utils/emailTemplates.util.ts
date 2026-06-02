// Templates de e-mail transacional (Fase 8).
// HTML simples com CSS inline, fundo branco e identidade do FreelaTracker — sem
// dependência externa de template engine. Cada função devolve { subject, html }.

const BRAND = '#4f6ef7';

// Casca comum: cabeçalho com a marca, corpo e rodapé. `bodyHtml` é o conteúdo
// específico de cada evento.
function layout(bodyHtml: string): string {
  return `
  <div style="background:#f3f4f6;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:${BRAND};padding:20px 28px;">
        <span style="color:#ffffff;font-size:18px;font-weight:bold;">FreelaTracker</span>
      </div>
      <div style="padding:28px;color:#1f2937;font-size:15px;line-height:1.6;">
        ${bodyHtml}
      </div>
      <div style="padding:18px 28px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
        Este é um e-mail automático do FreelaTracker. Por favor, não responda.
      </div>
    </div>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:bold;margin-top:8px;">${label}</a>`;
}

// Escapa texto livre vindo do usuário antes de injetar no HTML do e-mail.
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface EmailContent {
  subject: string;
  html: string;
}

export const emailTemplates = {
  welcome: (firstName: string, email: string, tempPassword: string, loginUrl: string): EmailContent => ({
    subject: 'Bem-vindo ao FreelaTracker — seus dados de acesso',
    html: layout(`
      <p>Olá, <strong>${escapeHtml(firstName)}</strong>!</p>
      <p>Uma conta foi criada para você acompanhar o andamento do seu projeto no FreelaTracker.</p>
      <p style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:14px;">
        <strong>E-mail:</strong> ${escapeHtml(email)}<br/>
        <strong>Senha temporária:</strong> ${escapeHtml(tempPassword)}
      </p>
      <p>No primeiro acesso você será solicitado a definir uma nova senha.</p>
      ${button(loginUrl, 'Acessar o portal')}
    `),
  }),

  deliveryCreated: (projectTitle: string, deliveryTitle: string, loginUrl: string): EmailContent => ({
    subject: `Nova entrega no projeto "${projectTitle}"`,
    html: layout(`
      <p>Uma nova entrega foi adicionada ao projeto <strong>${escapeHtml(projectTitle)}</strong>.</p>
      <p><strong>Entrega:</strong> ${escapeHtml(deliveryTitle)}</p>
      <p>Acesse o portal para revisar e aprovar ou solicitar alterações.</p>
      ${button(loginUrl, 'Ver entrega')}
    `),
  }),

  deliveryApproved: (projectTitle: string, deliveryTitle: string): EmailContent => ({
    subject: `Entrega aprovada — "${deliveryTitle}"`,
    html: layout(`
      <p>O cliente <strong>aprovou</strong> uma entrega do projeto <strong>${escapeHtml(projectTitle)}</strong>.</p>
      <p><strong>Entrega:</strong> ${escapeHtml(deliveryTitle)}</p>
    `),
  }),

  deliveryRejected: (projectTitle: string, deliveryTitle: string, feedback: string): EmailContent => ({
    subject: `Alteração solicitada — "${deliveryTitle}"`,
    html: layout(`
      <p>O cliente <strong>solicitou alterações</strong> em uma entrega do projeto <strong>${escapeHtml(projectTitle)}</strong>.</p>
      <p><strong>Entrega:</strong> ${escapeHtml(deliveryTitle)}</p>
      <p style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:14px;">
        <strong>Feedback do cliente:</strong><br/>${escapeHtml(feedback)}
      </p>
    `),
  }),

  statusUpdate: (projectTitle: string, statusLabel: string, loginUrl: string): EmailContent => ({
    subject: `Atualização no projeto "${projectTitle}"`,
    html: layout(`
      <p>O status do projeto <strong>${escapeHtml(projectTitle)}</strong> mudou para
      <strong>${escapeHtml(statusLabel)}</strong>.</p>
      ${button(loginUrl, 'Acompanhar projeto')}
    `),
  }),

  installmentDueSoon: (projectTitle: string, value: string, dueDate: string, loginUrl: string): EmailContent => ({
    subject: `Parcela próxima do vencimento — "${projectTitle}"`,
    html: layout(`
      <p>Uma parcela do projeto <strong>${escapeHtml(projectTitle)}</strong> está próxima do vencimento.</p>
      <p><strong>Valor:</strong> ${escapeHtml(value)}<br/>
         <strong>Vencimento:</strong> ${escapeHtml(dueDate)}</p>
      ${button(loginUrl, 'Ver detalhes')}
    `),
  }),

  installmentOverdue: (projectTitle: string, value: string, dueDate: string): EmailContent => ({
    subject: `Parcela vencida — "${projectTitle}"`,
    html: layout(`
      <p>Uma parcela do projeto <strong>${escapeHtml(projectTitle)}</strong> está <strong>vencida</strong>.</p>
      <p><strong>Valor:</strong> ${escapeHtml(value)}<br/>
         <strong>Vencimento:</strong> ${escapeHtml(dueDate)}</p>
    `),
  }),

  // E-mail manual escrito pelo admin no detalhe do projeto.
  manual: (projectTitle: string, subject: string, message: string): EmailContent => ({
    subject,
    html: layout(`
      <p style="color:#6b7280;font-size:13px;margin-top:0;">Sobre o projeto <strong>${escapeHtml(projectTitle)}</strong></p>
      <div>${escapeHtml(message).replace(/\n/g, '<br/>')}</div>
    `),
  }),
};
