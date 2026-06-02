import { useEffect, useRef, useState } from 'react'
import {
  IconPlayerPlay, IconPlayerPause, IconPlayerStop, IconClock, IconChevronDown, IconSearch,
} from '@tabler/icons-react'
import { timerService } from '../../services/timer.service'
import { projectService } from '../../services/project.service'
import type { ITimerSession } from '../../interfaces'
import { formatTime } from '../../utils/format'
import { apiErrorMessage } from '../../utils/apiError'
import styles from './TimerWidget.module.css'

interface TimerWidgetProps {
  // Quando fixado a um projeto (ex: na tela de detalhe), trava o seletor.
  fixedProjectId?: string
  // Chamado após start/stop para o parent recarregar (totalTime/updates mudaram).
  onChange?: () => void
}

interface ProjectOption {
  id: string
  title: string
  clientName: string | null
}

// Tempo ativo decorrido a partir do estado do servidor (sobrevive a reload).
function computeElapsed(session: ITimerSession): number {
  if (session.isPaused || !session.lastResumeAt) return session.accumulatedSeconds
  const segment = Math.floor((Date.now() - new Date(session.lastResumeAt).getTime()) / 1000)
  return session.accumulatedSeconds + Math.max(0, segment)
}

export function TimerWidget({ fixedProjectId, onChange }: TimerWidgetProps) {
  const [session, setSession] = useState<ITimerSession | null>(null)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedId, setSelectedId] = useState(fixedProjectId ?? '')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [showStop, setShowStop] = useState(false)
  const [stopNote, setStopNote] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Carrega timer ativo + lista de projetos
  useEffect(() => {
    timerService.getActive().then((res) => setSession(res.data.data)).catch(() => {})
    projectService.getAll()
      .then((res) =>
        setProjects(
          res.data.data
            .filter((p) => p.status !== 'ARCHIVED')
            .map((p) => ({ id: p.id, title: p.title, clientName: p.client?.name ?? null })),
        ),
      )
      .catch(() => {})
  }, [])

  // Cronômetro ao vivo: tica de 1s enquanto rodando e não pausado
  useEffect(() => {
    if (!session?.isActive) { setElapsed(0); return }
    setElapsed(computeElapsed(session))
    if (session.isPaused) return
    const tick = () => setElapsed(computeElapsed(session))
    const itv = setInterval(tick, 1000)
    return () => clearInterval(itv)
  }, [session])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const runningProject = session ? projects.find((p) => p.id === session.projectId) : null
  const runningElsewhere = Boolean(fixedProjectId && session && session.projectId !== fixedProjectId)

  async function handleStart() {
    const projectId = fixedProjectId ?? selectedId
    if (!projectId) return
    setBusy(true)
    setError('')
    try {
      const res = await timerService.start(projectId)
      setSession(res.data.data)
      onChange?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Erro ao iniciar timer.'))
    } finally {
      setBusy(false)
    }
  }

  async function handlePause() {
    if (!session) return
    setBusy(true)
    setError('')
    try {
      const res = await timerService.pause(session.id)
      setSession(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Erro ao pausar.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleResume() {
    if (!session) return
    setBusy(true)
    setError('')
    try {
      const res = await timerService.resume(session.id)
      setSession(res.data.data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Erro ao retomar.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleStopConfirm() {
    if (!session || stopNote.trim().length < 10) return
    setBusy(true)
    setError('')
    try {
      await timerService.stop(session.id, stopNote.trim())
      setSession(null)
      setShowStop(false)
      setStopNote('')
      onChange?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Erro ao parar timer.'))
    } finally {
      setBusy(false)
    }
  }

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  )
  const selectedOption = projects.find((p) => p.id === selectedId)

  // ── Sessão ativa ──────────────────────────────────────────────────────────
  if (session) {
    return (
      <div className={styles.widget}>
        <div className={styles.runningInfo}>
          <span className={`${styles.pulse} ${session.isPaused ? styles.pulsePaused : ''}`} />
          <div>
            <p className={styles.runningProject}>{runningProject?.title ?? 'Projeto'}</p>
            {runningProject?.clientName && (
              <p className={styles.runningClient}>{runningProject.clientName}</p>
            )}
          </div>
        </div>

        <div className={styles.clock}>
          <span className={styles.clockValue}>{formatTime(elapsed)}</span>
          <span className={styles.clockState}>{session.isPaused ? 'pausado' : 'em andamento'}</span>
        </div>

        <div className={styles.controls}>
          {session.isPaused ? (
            <button className={styles.btnResume} onClick={handleResume} disabled={busy} title="Retomar">
              <IconPlayerPlay size={16} /> Retomar
            </button>
          ) : (
            <button className={styles.btnPause} onClick={handlePause} disabled={busy} title="Pausar">
              <IconPlayerPause size={16} /> Pausar
            </button>
          )}
          <button className={styles.btnStop} onClick={() => setShowStop(true)} disabled={busy} title="Parar">
            <IconPlayerStop size={16} /> Parar
          </button>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {showStop && (
          <div className={styles.overlay} onClick={() => !busy && setShowStop(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>Encerrar sessão</h3>
              <p className={styles.modalSub}>
                Tempo registrado: <strong>{formatTime(elapsed)}</strong>. Descreva o que foi feito —
                isso vira uma atualização no projeto.
              </p>
              <textarea
                className={styles.noteArea}
                value={stopNote}
                onChange={(e) => setStopNote(e.target.value)}
                placeholder="Ex: implementei o layout do dashboard e ajustei a responsividade…"
                rows={4}
                autoFocus
              />
              <div className={styles.noteFooter}>
                <span className={styles.noteCount}>{stopNote.trim().length}/10 mín.</span>
                <div className={styles.modalActions}>
                  <button className={styles.btnGhost} onClick={() => setShowStop(false)} disabled={busy}>
                    Cancelar
                  </button>
                  <button
                    className={styles.btnStop}
                    onClick={handleStopConfirm}
                    disabled={busy || stopNote.trim().length < 10}
                  >
                    {busy ? 'Salvando...' : 'Encerrar e registrar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Sem sessão ativa: iniciar ────────────────────────────────────────────
  return (
    <div className={styles.widget}>
      <div className={styles.idleIcon}><IconClock size={20} /></div>

      {fixedProjectId ? (
        <p className={styles.idleHint}>Nenhum timer rodando neste projeto.</p>
      ) : runningElsewhere ? (
        <p className={styles.idleHint}>Há um timer ativo em outro projeto.</p>
      ) : (
        <div className={styles.selector} ref={dropdownRef}>
          <button className={styles.selectorBtn} onClick={() => setOpen((v) => !v)}>
            <span className={selectedOption ? styles.selectorValue : styles.selectorPlaceholder}>
              {selectedOption ? selectedOption.title : 'Selecione um projeto'}
            </span>
            <IconChevronDown size={16} />
          </button>
          {open && (
            <div className={styles.dropdown}>
              <div className={styles.searchRow}>
                <IconSearch size={14} />
                <input
                  className={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar projeto..."
                  autoFocus
                />
              </div>
              <div className={styles.optionList}>
                {filtered.length === 0 ? (
                  <p className={styles.noOptions}>Nenhum projeto encontrado</p>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      className={styles.option}
                      onClick={() => { setSelectedId(p.id); setOpen(false); setSearch('') }}
                    >
                      <span className={styles.optionTitle}>{p.title}</span>
                      {p.clientName && <span className={styles.optionClient}>{p.clientName}</span>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmação visual do cliente do projeto selecionado */}
      {!fixedProjectId && selectedOption?.clientName && (
        <span className={styles.selectedClient}>Cliente: {selectedOption.clientName}</span>
      )}

      <button
        className={styles.btnStart}
        onClick={handleStart}
        disabled={busy || runningElsewhere || (!fixedProjectId && !selectedId)}
      >
        <IconPlayerPlay size={16} /> {busy ? 'Iniciando...' : 'Iniciar'}
      </button>

      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  )
}
