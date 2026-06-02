import { useEffect, useMemo, useState } from 'react'
import { IconDownload, IconClock } from '@tabler/icons-react'
import { timerService } from '../../services/timer.service'
import type { ITimerSession } from '../../interfaces'
import { formatTime, formatDate } from '../../utils/format'
import { toCSV, downloadCSV } from '../../utils/csv'
import styles from './SessionHistory.module.css'

// Início da semana (segunda-feira) de uma data, à meia-noite local.
function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // 0 = segunda
  d.setDate(d.getDate() - day)
  return d
}

interface WeekGroup {
  key: string
  start: Date
  sessions: ITimerSession[]
  totalSeconds: number
}

// Hora local curta (HH:MM) de uma string ISO.
function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Histórico de sessões do timer (Fase 10), agrupado por semana com total semanal
// e exportação CSV. Mostra apenas sessões concluídas.
export function SessionHistory({ projectId, projectTitle }: { projectId: string; projectTitle: string }) {
  const [sessions, setSessions] = useState<ITimerSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    timerService.getByProject(projectId)
      .then((res) => setSessions(res.data.data.filter((s) => !s.isActive && s.endTime)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  // Agrupa por semana (mais recente primeiro), somando a duração de cada uma.
  const weeks = useMemo<WeekGroup[]>(() => {
    const map = new Map<string, WeekGroup>()
    for (const session of sessions) {
      const start = weekStart(new Date(session.startTime))
      const key = start.toISOString()
      const group = map.get(key) ?? { key, start, sessions: [], totalSeconds: 0 }
      group.sessions.push(session)
      group.totalSeconds += session.duration ?? 0
      map.set(key, group)
    }
    const list = Array.from(map.values())
    list.forEach((g) => g.sessions.sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime)))
    return list.sort((a, b) => +b.start - +a.start)
  }, [sessions])

  function handleExport() {
    const headers = ['Data', 'Início', 'Fim', 'Duração', 'Anotação']
    const rows = sessions
      .slice()
      .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime))
      .map((s) => [
        formatDate(s.startTime),
        hhmm(s.startTime),
        s.endTime ? hhmm(s.endTime) : '',
        formatTime(s.duration ?? 0),
        s.note ?? '',
      ])
    const safeTitle = projectTitle.replace(/[^\w-]+/g, '_').slice(0, 40)
    downloadCSV(`sessoes_${safeTitle}.csv`, toCSV(headers, rows))
  }

  if (loading) return <p className={styles.note}>Carregando histórico...</p>
  if (sessions.length === 0) return <p className={styles.note}>Nenhuma sessão registrada ainda.</p>

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <span className={styles.summary}>
          <IconClock size={14} /> {sessions.length} sessões
        </span>
        <button className={styles.btnExport} onClick={handleExport}>
          <IconDownload size={14} /> Exportar CSV
        </button>
      </div>

      {weeks.map((week) => (
        <div key={week.key} className={styles.week}>
          <div className={styles.weekHead}>
            <span className={styles.weekLabel}>Semana de {formatDate(week.start.toISOString())}</span>
            <span className={styles.weekTotal}>{formatTime(week.totalSeconds)}</span>
          </div>
          <div className={styles.rows}>
            {week.sessions.map((s) => (
              <div key={s.id} className={styles.row}>
                <span className={styles.cellDate}>{formatDate(s.startTime)}</span>
                <span className={styles.cellTime}>
                  {hhmm(s.startTime)}–{s.endTime ? hhmm(s.endTime) : '—'}
                </span>
                <span className={styles.cellDuration}>{formatTime(s.duration ?? 0)}</span>
                <span className={styles.cellNote}>{s.note ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
