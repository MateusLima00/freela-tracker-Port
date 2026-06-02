export const STATUS_LABEL: Record<string, string> = {
  PENDING:         'Pendente',
  IN_PROGRESS:     'Em andamento',
  AWAITING_CLIENT: 'Aguardando cliente',
  COMPLETED:       'Concluído',
  PAUSED:          'Pausado',
  ARCHIVED:        'Arquivado',
  TODO:            'A fazer',
  DONE:            'Concluído',
  LOW:             'Baixa',
  MEDIUM:          'Média',
  HIGH:            'Alta',
  // Entregas (Fase 7)
  PENDING_REVIEW:  'Aguardando revisão',
  APPROVED:        'Aprovada',
  REJECTED:        'Alteração solicitada',
  IN_REVISION:     'Em revisão',
}

export const TASK_STATUS_ICON: Record<string, string> = {
  TODO:        '○',
  IN_PROGRESS: '◑',
  DONE:        '✓',
}

import type { IClientPermissions } from '../interfaces'

// Permissões padrão de um cliente recém-criado (espelha o backend)
export const DEFAULT_CLIENT_PERMISSIONS: IClientPermissions = {
  viewProgress: true,
  viewDeliveries: true,
  approveDeliveries: true,
  viewUpdates: true,
  viewPayments: false,
  receiveEmailOnDelivery: true,
  receiveEmailOnUpdate: false,
  receiveEmailOnPayment: true,
}

// Metadados para renderizar os toggles de permissão, agrupados por seção
export const PERMISSION_GROUPS: Array<{
  group: string
  items: Array<{ key: keyof IClientPermissions; label: string; description: string }>
}> = [
  {
    group: 'Visualização no portal',
    items: [
      { key: 'viewProgress',   label: 'Ver progresso',   description: 'Acompanhar barra de progresso e status' },
      { key: 'viewUpdates',    label: 'Ver atualizações', description: 'Ler o feed de atualizações do projeto' },
      { key: 'viewDeliveries', label: 'Ver entregas',    description: 'Visualizar entregas enviadas' },
      { key: 'viewPayments',   label: 'Ver pagamentos',  description: 'Ver valores, parcelas e status financeiro' },
    ],
  },
  {
    group: 'Ações',
    items: [
      { key: 'approveDeliveries', label: 'Aprovar entregas', description: 'Aprovar ou solicitar alterações em entregas' },
    ],
  },
  {
    group: 'Notificações por e-mail',
    items: [
      { key: 'receiveEmailOnDelivery', label: 'Nova entrega',     description: 'E-mail ao receber uma nova entrega' },
      { key: 'receiveEmailOnUpdate',   label: 'Nova atualização', description: 'E-mail a cada atualização publicada' },
      { key: 'receiveEmailOnPayment',  label: 'Pagamento',        description: 'E-mail sobre parcelas e vencimentos' },
    ],
  },
]
