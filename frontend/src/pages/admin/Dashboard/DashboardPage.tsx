import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import {
  IconBriefcase, IconUsers, IconCircleCheck, IconClock, IconTrendingUp,
  IconTrendingDown, IconMinus, IconBell, IconPackage, IconMessage, IconCash,
  IconRefresh, IconAlertTriangle, IconCalendarTime,
} from '@tabler/icons-react'
import { statsService } from '../../../services/stats.service'
import type { IDashboard, IStatCard, UpdateType } from '../../../interfaces'
import { Badge } from '../../../components/Badge/Badge'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { TimerWidget } from '../../../components/TimerWidget/TimerWidget'
import { STATUS_LABEL } from '../../../utils/constants'
import { formatDate, formatDateTime, formatMoney, daysUntil } from '../../../utils/format'
import styles from './DashboardPage.module.css'

// ── Cores por status ──────────────────────────────────────────────────────────
const PROJECT_STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS:     '#6366f1',
  AWAITING_CLIENT: '#38bdf8',
  COMPLETED:       '#22c55e',
  PAUSED:          '#f59e0b',
  PENDING:         '#94a3b8',
}

const TASK_STATUS_COLOR: Record<string, string> = {
  TODO:        '#94a3b8',
  IN_PROGRESS: '#6366f1',
  DONE:        '#22c55e',
}

const CARD_ICON: Record<string, React.ReactNode> = {
  activeProjects: <IconBriefcase size={22} />,
  clients:        <IconUsers size={22} />,
  pendingTasks:   <IconCircleCheck size={22} />,
  timeLogged:     <IconClock size={22} />,
}

// Ícone do feed de atividade por tipo de evento (§2)
const ACTIVITY_ICON: Record<UpdateType, React.ReactNode> = {
  TIMER:     <IconClock size={14} />,
  DELIVERY:  <IconPackage size={14} />,
  APPROVAL:  <IconCircleCheck size={14} />,
  REJECTION: <IconMessage size={14} />,
  PAYMENT:   <IconCash size={14} />,
  STATUS:    <IconRefresh size={14} />,
  GENERAL:   <IconBell size={14} />,
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{payload[0].name}</span>
      <span className={styles.tooltipValue}>{payload[0].value}</span>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<IDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    statsService.getDashboard()
      .then((res) => setData(res.data.data))
      .catch(() => setError('Erro ao carregar dashboard.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <p className="pageState">Carregando...</p>
  if (error)     return <p className="pageState pageStateError">{error}</p>
  if (!data)     return null

  const donutData = data.projectsByStatus.map((item) => ({
    name:  STATUS_LABEL[item.status] ?? item.status,
    value: item._count.status,
    color: PROJECT_STATUS_COLOR[item.status] ?? '#64748b',
  }))

  const barData = data.tasksByStatus.map((item) => ({
    name:  STATUS_LABEL[item.status] ?? item.status,
    value: item._count.status,
    color: TASK_STATUS_COLOR[item.status] ?? '#64748b',
  }))

  const totalTasks = barData.reduce((acc, d) => acc + d.value, 0)
  const fin = data.financialSummary

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Dashboard</h1>

      {/* ── Timer integrado ── */}
      <TimerWidget />

      {/* ── Stat cards ── */}
      <div className={styles.statGrid}>
        {data.statCards.map((card) => (
          <StatCard key={card.key} card={card} icon={CARD_ICON[card.key]} />
        ))}
      </div>

      {/* ── Resumo financeiro (card de pagamentos) ── */}
      <section className={styles.financeCard}>
        <FinanceItem label="Total faturado" value={formatMoney(fin.totalBilled, fin.currency)} />
        <FinanceItem label="Recebido" value={formatMoney(fin.totalReceived, fin.currency)} accent="success" />
        <FinanceItem label="Saldo a receber" value={formatMoney(fin.balance, fin.currency)} />
        <div className={styles.financeOverdue}>
          {fin.overdueCount > 0 ? (
            <span className={styles.overdueBadge}>
              <IconAlertTriangle size={14} /> {fin.overdueCount} parcela(s) vencida(s)
            </span>
          ) : (
            <span className={styles.okBadge}><IconCircleCheck size={14} /> Sem parcelas vencidas</span>
          )}
        </div>
      </section>

      {/* ── Conteúdo principal ── */}
      <div className={styles.mainGrid}>

        {/* Coluna esquerda — projetos ativos (grid de cards) + atividade */}
        <div className={styles.leftCol}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Projetos Ativos</h2>
            {data.activeProjects.length === 0 ? (
              <EmptyState icon={<IconBriefcase size={32} />} text="Nenhum projeto ativo" />
            ) : (
              <div className={styles.projectGrid}>
                {data.activeProjects.map((p) => (
                  <div
                    key={p.id}
                    className={`${styles.projectCard} ${p.overBudget ? styles.projectOver : ''}`}
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <div className={styles.projectCardTop}>
                      <span
                        className={styles.statusDot}
                        style={{ background: PROJECT_STATUS_COLOR[p.status] ?? '#64748b' }}
                      />
                      <p className={styles.projectCardName}>{p.title}</p>
                      <Badge value={p.status} />
                    </div>
                    {p.client && <p className={styles.projectCardClient}>{p.client.name}</p>}

                    <ProgressBar percent={p.progress} height={5} />
                    <div className={styles.projectCardMeta}>
                      <span className={p.overBudget ? styles.metaDanger : ''}>
                        {p.hoursLogged}h{p.estimatedHours != null ? ` / ${p.estimatedHours}h` : ''}
                      </span>
                      <span>{p.tasksDone}/{p.tasksTotal} tarefas</span>
                      <span>{p.deadline ? formatDate(p.deadline) : 'sem prazo'}</span>
                    </div>
                    {p.overBudget && (
                      <p className={styles.overWarn}><IconAlertTriangle size={12} /> Horas acima da estimativa</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Feed de atividade recente */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Atividade Recente</h2>
            </div>
            {data.recentActivity.length === 0 ? (
              <EmptyState icon={<IconBell size={28} />} text="Nenhuma atividade ainda" />
            ) : (
              <div className={styles.activityList}>
                {data.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className={styles.activityItem}
                    onClick={() => navigate(`/projects/${item.projectId}`)}
                  >
                    <div className={`${styles.activityIconWrap} ${styles[`act_${item.type}`] ?? ''}`}>
                      {ACTIVITY_ICON[item.type] ?? <IconBell size={14} />}
                    </div>
                    <div className={styles.activityBody}>
                      <p className={styles.activityTitle}>{item.updateTitle}</p>
                      <p className={styles.activityMeta}>
                        {item.projectTitle} · {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Coluna direita — próximas tarefas + gráficos */}
        <div className={styles.rightCol}>

          {/* Próximas tarefas (7 dias) */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Próximas Tarefas</h2>
            {data.upcomingTasks.length === 0 ? (
              <EmptyState icon={<IconCalendarTime size={28} />} text="Nada nos próximos 7 dias" />
            ) : (
              <div className={styles.taskList}>
                {data.upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    className={styles.taskItem}
                    onClick={() => navigate(`/projects/${t.projectId}`)}
                  >
                    <Badge value={t.priority} />
                    <div className={styles.taskBody}>
                      <p className={styles.taskTitle}>{t.title}</p>
                      <p className={styles.taskMeta}>
                        {t.projectTitle}{t.dueDate ? ` · ${dueLabel(t.dueDate)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Gráfico de rosca — projetos por status */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Projetos por Status</h2>
            {donutData.length === 0 ? (
              <EmptyState icon={<IconBriefcase size={28} />} text="Sem dados" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.legend}>
                  {donutData.map((item) => (
                    <div key={item.name} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ background: item.color }} />
                      <span className={styles.legendLabel}>{item.name}</span>
                      <span className={styles.legendCount}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Barras horizontais — tarefas por status */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Tarefas por Status</h2>
            {barData.length === 0 ? (
              <EmptyState icon={<IconCircleCheck size={28} />} text="Sem tarefas" />
            ) : (
              <div className={styles.barList}>
                {barData.map((item) => {
                  const pct = totalTasks > 0 ? Math.round((item.value / totalTasks) * 100) : 0
                  return (
                    <div key={item.name} className={styles.barRow}>
                      <span className={styles.barLabel}>{item.name}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                      <span className={styles.barCount}>{item.value}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function StatCard({ card, icon }: { card: IStatCard; icon?: React.ReactNode }) {
  const DeltaIcon = card.deltaPositive ? IconTrendingUp : card.delta === '0%' ? IconMinus : IconTrendingDown
  const hasSparkline = card.sparkline && card.sparkline.length > 0

  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTop}>
        <div className={`${styles.statIcon} ${card.deltaPositive ? styles.statIconPositive : styles.statIconNeutral}`}>
          {icon}
        </div>
        <div className={`${styles.statDelta} ${card.deltaPositive ? styles.deltaPositive : styles.deltaNeutral}`}>
          <DeltaIcon size={13} />
          <span>{card.delta}</span>
        </div>
      </div>
      <p className={styles.statValue}>{card.value}</p>
      <p className={styles.statLabel}>{card.label}</p>
      {hasSparkline ? (
        // Sparkline de horas dos últimos 7 dias
        <div className={styles.sparkline}>
          <ResponsiveContainer width="100%" height={32}>
            <LineChart data={card.sparkline} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
              <Line type="monotone" dataKey="hours" stroke="#4f6ef7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className={styles.statSub}>{card.sub}</p>
      )}
    </div>
  )
}

function FinanceItem({ label, value, accent }: { label: string; value: string; accent?: 'success' }) {
  return (
    <div className={styles.financeItem}>
      <span className={styles.financeLabel}>{label}</span>
      <span className={`${styles.financeValue} ${accent === 'success' ? styles.financeSuccess : ''}`}>{value}</span>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <p className={styles.emptyText}>{text}</p>
    </div>
  )
}

// Rótulo curto de prazo da tarefa (Hoje / Xd / atrasado).
function dueLabel(dateStr: string): string {
  const d = daysUntil(dateStr)
  if (d < 0) return `${Math.abs(d)}d atrás`
  if (d === 0) return 'Hoje'
  if (d === 1) return 'Amanhã'
  return `em ${d} dias`
}
