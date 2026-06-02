import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { IconDownload, IconAlertTriangle } from '@tabler/icons-react'
import { projectService } from '../../../services/project.service'
import { reportService } from '../../../services/report.service'
import type { IProject, IProjectReport } from '../../../interfaces'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { formatTime, formatDate } from '../../../utils/format'
import { toCSV, downloadCSV } from '../../../utils/csv'
import styles from './ReportsPage.module.css'

// Data de N dias atrás no formato yyyy-mm-dd (para os inputs date).
function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000)
  return d.toISOString().split('T')[0]
}

// Rótulo curto DD/MM a partir de YYYY-MM-DD (eixo X do gráfico).
function shortDate(ymd: string): string {
  const [, m, d] = ymd.split('-')
  return `${d}/${m}`
}

// Hora local curta (HH:MM) de uma string ISO.
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function ReportsPage() {
  const [projects, setProjects] = useState<IProject[]>([])
  const [projectId, setProjectId] = useState('')
  const [from, setFrom] = useState(isoDaysAgo(29))
  const [to, setTo] = useState(isoDaysAgo(0))

  const [report, setReport] = useState<IProjectReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Carrega a lista de projetos para o seletor; pré-seleciona o primeiro.
  useEffect(() => {
    projectService.getAll()
      .then((res) => {
        setProjects(res.data.data)
        if (res.data.data.length > 0) setProjectId(res.data.data[0].id)
      })
      .catch(() => setError('Erro ao carregar projetos.'))
  }, [])

  // Busca o relatório sempre que projeto ou intervalo mudam.
  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setError('')
    reportService.getProjectReport(projectId, from, to)
      .then((res) => setReport(res.data.data))
      .catch(() => setError('Erro ao gerar relatório.'))
      .finally(() => setLoading(false))
  }, [projectId, from, to])

  // Dados do gráfico (horas por dia).
  const chartData = useMemo(
    () => (report?.daily ?? []).map((d) => ({ label: shortDate(d.date), hours: d.hours })),
    [report],
  )

  function handleExport() {
    if (!report) return
    const headers = ['Data', 'Início', 'Fim', 'Duração', 'Anotação']
    const rows = report.sessions.map((s) => [
      formatDate(s.startTime),
      hhmm(s.startTime),
      s.endTime ? hhmm(s.endTime) : '',
      formatTime(s.duration ?? 0),
      s.note ?? '',
    ])
    const safeTitle = report.project.title.replace(/[^\w-]+/g, '_').slice(0, 40)
    downloadCSV(`relatorio_${safeTitle}_${from}_a_${to}.csv`, toCSV(headers, rows))
  }

  const cmp = report?.estimateComparison

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Relatório de horas</h1>
        <p className={styles.subtitle}>Horas trabalhadas por projeto e período.</p>
      </header>

      {/* Filtros */}
      <div className={styles.filters}>
        <div className={styles.field}>
          <label className={styles.label}>Projeto</label>
          <select
            className={styles.select}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.length === 0 && <option value="">Nenhum projeto</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>De</label>
          <input type="date" className={styles.input} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Até</label>
          <input type="date" className={styles.input} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className={styles.btnExport} onClick={handleExport} disabled={!report || report.sessions.length === 0}>
          <IconDownload size={15} /> Exportar CSV
        </button>
      </div>

      {error && <p className="pageState pageStateError">{error}</p>}
      {loading && <p className={styles.note}>Gerando relatório...</p>}

      {report && !loading && (
        <>
          {/* Cards de totais */}
          <div className={styles.stats}>
            <StatCard label="Total no período" value={formatTime(report.totals.totalSeconds)} />
            <StatCard label="Sessões" value={String(report.totals.sessionCount)} />
            <StatCard label="Média diária" value={`${report.totals.dailyAverageHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`} />
            <StatCard label="Dias no período" value={String(report.totals.dayCount)} />
          </div>

          {/* Comparativo com a estimativa */}
          {cmp ? (
            <div className={`${styles.estimate} ${cmp.overBudget ? styles.estimateOver : ''}`}>
              <div className={styles.estimateTop}>
                <span className={styles.estimateLabel}>
                  {cmp.overBudget && <IconAlertTriangle size={15} />}
                  {report.totals.totalHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h de {cmp.estimatedHours}h estimadas
                </span>
                <span className={styles.estimatePct}>{cmp.percentUsed.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%</span>
              </div>
              <ProgressBar percent={Math.min(cmp.percentUsed, 100)} height={8} />
              {cmp.overBudget && (
                <p className={styles.estimateWarn}>As horas registradas ultrapassaram a estimativa do projeto.</p>
              )}
            </div>
          ) : (
            <p className={styles.note}>Defina uma estimativa de horas no projeto para ver o comparativo.</p>
          )}

          {/* Gráfico de barras: horas por dia */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Horas por dia</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(79,110,247,0.08)' }}
                  contentStyle={{
                    background: '#1c2333', border: '1px solid rgba(255,255,255,0.13)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 12,
                  }}
                  formatter={(value) => [`${value}h`, 'Horas']}
                />
                <Bar dataKey="hours" fill="#4f6ef7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela de sessões */}
          <div className={styles.tableCard}>
            <p className={styles.chartTitle}>Sessões detalhadas</p>
            {report.sessions.length === 0 ? (
              <p className={styles.note}>Nenhuma sessão no período selecionado.</p>
            ) : (
              <div className={styles.table}>
                <div className={`${styles.tRow} ${styles.tHead}`}>
                  <span>Data</span><span>Início</span><span>Fim</span><span>Duração</span><span>Anotação</span>
                </div>
                {report.sessions
                  .slice()
                  .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime))
                  .map((s) => (
                    <div key={s.id} className={styles.tRow}>
                      <span>{formatDate(s.startTime)}</span>
                      <span>{hhmm(s.startTime)}</span>
                      <span>{s.endTime ? hhmm(s.endTime) : '—'}</span>
                      <span className={styles.tDuration}>{formatTime(s.duration ?? 0)}</span>
                      <span className={styles.tNote}>{s.note ?? '—'}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}
