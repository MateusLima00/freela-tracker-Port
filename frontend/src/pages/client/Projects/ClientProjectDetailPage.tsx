import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconChartBar, IconClock, IconChecklist, IconCalendarTime,
} from '@tabler/icons-react'
import { clientService } from '../../../services/client.service'
import { useAuth } from '../../../hooks/useAuth'
import type { IProject, IClientFinancial } from '../../../interfaces'
import { TaskStatus } from '../../../enums'
import { Badge } from '../../../components/Badge/Badge'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { DeliveriesClient } from '../../../components/Deliveries/DeliveriesClient'
import { TASK_STATUS_ICON } from '../../../utils/constants'
import { formatHours, formatDate, formatDateTime, daysUntil, formatMoney } from '../../../utils/format'

const BILLING_LABEL: Record<string, string> = {
  FIXED: 'Valor fixo',
  HOURLY: 'Por hora',
  INSTALLMENTS: 'Parcelado',
}
import styles from './ClientProjectDetailPage.module.css'

const TASK_GROUPS: Array<{ status: TaskStatus; label: string }> = [
  { status: TaskStatus.IN_PROGRESS, label: 'Em andamento' },
  { status: TaskStatus.TODO, label: 'A fazer' },
  { status: TaskStatus.DONE, label: 'Concluídas' },
]

// Texto amigável de prazo a partir dos dias restantes
function deadlineLabel(deadline: string): { value: string; danger: boolean } {
  const d = daysUntil(deadline)
  if (d < 0) return { value: `${Math.abs(d)}d atrás`, danger: true }
  if (d === 0) return { value: 'Hoje', danger: true }
  return { value: `${d} dia${d > 1 ? 's' : ''}`, danger: d <= 7 }
}

export function ClientProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const perms = user?.kind === 'client' ? user.permissions : undefined

  const [project, setProject] = useState<IProject | null>(null)
  const [financial, setFinancial] = useState<IClientFinancial | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    clientService.getMyProject(id)
      .then((res) => setProject(res.data.data))
      .catch(() => setError('Projeto não encontrado.'))
      .finally(() => setIsLoading(false))
  }, [id])

  // Financeiro só é buscado se o cliente tiver a permissão viewPayments
  useEffect(() => {
    if (!id || !(perms?.viewPayments)) return
    clientService.getFinancial(id)
      .then((res) => setFinancial(res.data.data))
      .catch(() => setFinancial(null))
  }, [id, perms?.viewPayments])

  if (isLoading) return <p className="pageState">Carregando...</p>
  if (error || !project) return <p className="pageState pageStateError">{error || 'Projeto não encontrado.'}</p>

  const tasksDone = project.tasks.filter((t) => t.status === TaskStatus.DONE).length
  const showProgress = perms?.viewProgress ?? true
  const showUpdates = (perms?.viewUpdates ?? true) && project.updates.length > 0
  const deadline = project.deadline ? deadlineLabel(project.deadline) : null
  const payPct = financial && financial.total > 0
    ? Math.round((financial.totalPaid / financial.total) * 100)
    : 0

  return (
    <div className={styles.page}>
      <button onClick={() => navigate('/client/projects')} className={styles.back}>
        <IconArrowLeft size={16} /> Meus Projetos
      </button>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{project.title}</h1>
          {project.description && <p className={styles.desc}>{project.description}</p>}
        </div>
        <Badge value={project.status} />
      </div>

      {/* ── Mini cards de métrica ── */}
      <div className={styles.metrics}>
        {showProgress && (
          <MetricCard icon={<IconChartBar size={18} />} label="Progresso" value={`${project.progress}%`} />
        )}
        <MetricCard icon={<IconClock size={18} />} label="Tempo investido" value={formatHours(project.totalTime)} />
        <MetricCard
          icon={<IconChecklist size={18} />}
          label="Tarefas"
          value={`${tasksDone}/${project.tasks.length}`}
        />
        <MetricCard
          icon={<IconCalendarTime size={18} />}
          label="Prazo"
          value={deadline?.value ?? '—'}
          danger={deadline?.danger}
          sub={project.deadline ? formatDate(project.deadline) : 'sem prazo definido'}
        />
      </div>

      {/* ── Barra de progresso ── */}
      {showProgress && (
        <div className={styles.progressCard}>
          <div className={styles.progressTop}>
            <span className={styles.progressLabel}>Progresso geral</span>
            <span className={styles.progressPct}>{project.progress}%</span>
          </div>
          <ProgressBar percent={project.progress} height={8} />
        </div>
      )}

      {/* ── Financeiro (se permissão viewPayments) ── */}
      {financial && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Financeiro</h2>
          <div className={styles.finSummary}>
            <div className={styles.finItem}>
              <span className={styles.finLabel}>Cobrança</span>
              <span className={styles.finValue}>{BILLING_LABEL[financial.billingType]}</span>
            </div>
            <div className={styles.finItem}>
              <span className={styles.finLabel}>Total</span>
              <span className={styles.finValue}>{formatMoney(financial.total, financial.currency)}</span>
            </div>
            <div className={styles.finItem}>
              <span className={styles.finLabel}>Pago</span>
              <span className={styles.finValue}>{formatMoney(financial.totalPaid, financial.currency)}</span>
            </div>
          </div>

          <div className={styles.finProgress}>
            <ProgressBar percent={payPct} height={6} />
            <span className={styles.finProgressLabel}>
              {payPct}% pago · falta {formatMoney(financial.balance, financial.currency)}
            </span>
          </div>

          {financial.billingType === 'HOURLY' && financial.hours !== null && (
            <p className={styles.finHint}>
              {formatHours(financial.hours * 3600)} × {formatMoney(financial.hourlyRate ?? 0, financial.currency)}
            </p>
          )}

          {financial.installments.length > 0 && (
            <div className={styles.instTable}>
              {financial.installments.map((inst) => (
                <div key={inst.id} className={styles.instRow}>
                  <span className={styles.instNum}>{inst.number}</span>
                  <span className={styles.instDesc}>{inst.description ?? `Parcela ${inst.number}`}</span>
                  <span className={styles.instDue}>{inst.dueDate ? formatDate(inst.dueDate) : '—'}</span>
                  <span className={styles.instValue}>{formatMoney(inst.value, financial.currency)}</span>
                  <span className={`${styles.instStatus} ${inst.status === 'PAID' ? styles.instPaid : styles.instPending}`}>
                    {inst.status === 'PAID' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Entregas (se permissão viewDeliveries) ── */}
      {id && (perms?.viewDeliveries ?? true) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Entregas</h2>
          <DeliveriesClient projectId={id} canApprove={perms?.approveDeliveries ?? false} />
        </section>
      )}

      {/* ── Timeline de milestones (updates como marcos) ── */}
      {showUpdates && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Linha do tempo</h2>
          <div className={styles.milestones}>
            {project.updates.map((u) => (
              <div key={u.id} className={styles.milestone}>
                <div className={styles.milestoneDot} />
                <p className={styles.milestoneTitle}>{u.title}</p>
                <p className={styles.milestoneDate}>{formatDate(u.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Grid 65/35: tarefas + feed de atualizações ── */}
      <div className={styles.grid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tarefas</h2>
          {project.tasks.length === 0 ? (
            <p className={styles.empty}>Nenhuma tarefa cadastrada ainda.</p>
          ) : (
            TASK_GROUPS.map((group) => {
              const tasks = project.tasks.filter((t) => t.status === group.status)
              if (tasks.length === 0) return null
              return (
                <div key={group.status} className={styles.taskGroup}>
                  <p className={styles.taskGroupLabel}>
                    {group.label} <span className={styles.taskGroupCount}>{tasks.length}</span>
                  </p>
                  <div className={styles.taskList}>
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`${styles.taskRow} ${task.status === TaskStatus.DONE ? styles.taskDone : ''}`}
                      >
                        <span className={styles.taskIcon}>{TASK_STATUS_ICON[task.status]}</span>
                        <span className={styles.taskTitle}>{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </section>

        {showUpdates && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Atualizações</h2>
            <div className={styles.feed}>
              {project.updates.map((update) => (
                <div key={update.id} className={styles.updateCard}>
                  <div className={styles.updateDot} />
                  <div className={styles.updateBody}>
                    <p className={styles.updateTitle}>{update.title}</p>
                    <p className={styles.updateDate}>{formatDateTime(update.createdAt)}</p>
                    <p className={styles.updateContent}>{update.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ── Mini card de métrica ──────────────────────────────────────────
function MetricCard({
  icon, label, value, sub, danger,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  danger?: boolean
}) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricIcon}>{icon}</div>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${danger ? styles.metricDanger : ''}`}>{value}</span>
      {sub && <span className={styles.metricSub}>{sub}</span>}
    </div>
  )
}
