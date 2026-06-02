import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconBriefcase, IconPlus, IconUnlink,
  IconCalendar, IconMail, IconNote, IconShieldLock, IconDeviceFloppy, IconCheck,
} from '@tabler/icons-react'
import { adminClientService } from '../../../services/adminClient.service'
import type { IClientDetail } from '../../../services/adminClient.service'
import type { IProject, IClientPermissions } from '../../../interfaces'
import { Badge } from '../../../components/Badge/Badge'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { PermissionsEditor } from '../../../components/PermissionsEditor/PermissionsEditor'
import { formatDate, formatTime } from '../../../utils/format'
import { apiErrorMessage } from '../../../utils/apiError'
import { DEFAULT_CLIENT_PERMISSIONS } from '../../../utils/constants'
import styles from './ClientDetailPage.module.css'

type ProjectSummary = IClientDetail['projects'][number]
type UnlinkedProject = Pick<IProject, 'id' | 'title' | 'status'>

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [client, setClient]           = useState<IClientDetail | null>(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState('')
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [unlinked, setUnlinked]       = useState<UnlinkedProject[]>([])
  const [linkBusy, setLinkBusy]       = useState<string | null>(null)
  const [projectsError, setProjectsError] = useState('') // erros de vincular/desvincular

  // Configurações editáveis (notas internas + permissões)
  const [notes, setNotes]             = useState('')
  const [permissions, setPermissions] = useState<IClientPermissions>(DEFAULT_CLIENT_PERMISSIONS)
  const [savingSettings, setSavingSettings] = useState(false)
  const [savedFlash, setSavedFlash]   = useState(false)
  const [settingsError, setSettingsError] = useState('')

  useEffect(() => {
    if (!id) return
    adminClientService.getById(id)
      .then((res) => {
        setClient(res.data.data)
        setNotes(res.data.data.notes ?? '')
        setPermissions(res.data.data.permissions ?? DEFAULT_CLIENT_PERMISSIONS)
      })
      .catch(() => setError('Cliente não encontrado.'))
      .finally(() => setIsLoading(false))
  }, [id])

  async function handleSaveSettings() {
    if (!id) return
    setSavingSettings(true)
    setSavedFlash(false)
    setSettingsError('')
    try {
      const res = await adminClientService.update(id, { notes, permissions })
      setClient((prev) => (prev ? { ...prev, notes: res.data.data.notes, permissions: res.data.data.permissions } : prev))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (err) {
      setSettingsError(apiErrorMessage(err, 'Erro ao salvar configurações.'))
    } finally {
      setSavingSettings(false)
    }
  }

  async function loadUnlinked() {
    try {
      const res = await adminClientService.listUnlinkedProjects()
      setUnlinked(res.data.data)
    } catch { setUnlinked([]) }
  }

  async function handleLink(projectId: string) {
    if (!id) return
    setLinkBusy(projectId)
    setProjectsError('')
    try {
      const res = await adminClientService.linkProject(id, projectId)
      const linked = res.data.data as ProjectSummary
      setClient((prev) => prev ? { ...prev, projects: [linked, ...prev.projects] } : prev)
      setUnlinked((prev) => prev.filter((p) => p.id !== projectId))
    } catch (err) {
      setProjectsError(apiErrorMessage(err, 'Erro ao vincular projeto.'))
    } finally {
      setLinkBusy(null)
    }
  }

  async function handleUnlink(projectId: string, title: string) {
    if (!id || !confirm(`Remover vínculo do projeto "${title}"?`)) return
    setProjectsError('')
    try {
      await adminClientService.unlinkProject(id, projectId)
      setClient((prev) =>
        prev ? { ...prev, projects: prev.projects.filter((p) => p.id !== projectId) } : prev
      )
    } catch (err) {
      setProjectsError(apiErrorMessage(err, 'Erro ao remover vínculo.'))
    }
  }

  if (isLoading) return <p className="pageState">Carregando...</p>
  if (error || !client) return <p className="pageState pageStateError">{error || 'Cliente não encontrado.'}</p>

  return (
    <div className={styles.page}>
      {/* ── Back ── */}
      <button onClick={() => navigate('/clients')} className={styles.back}>
        <IconArrowLeft size={16} />
        Clientes
      </button>

      {/* ── Header do cliente ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className={styles.clientName}>{client.name}</h1>
            <div className={styles.clientMeta}>
              <span className={styles.metaItem}>
                <IconMail size={13} />
                {client.email}
              </span>
              <span className={styles.metaItem}>
                <IconCalendar size={13} />
                cliente desde {formatDate(client.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Projetos vinculados ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Projetos Vinculados</h2>
            <p className={styles.sectionSub}>{client.projects.length} projeto{client.projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            className={styles.btnSecondary}
            onClick={() => { setShowLinkPanel((v) => !v); loadUnlinked() }}
          >
            <IconPlus size={15} />
            Adicionar projeto
          </button>
        </div>

        {projectsError && <p className="errorBanner">{projectsError}</p>}

        {/* Painel de projetos disponíveis para vincular */}
        {showLinkPanel && (
          <div className={styles.linkPanel}>
            <p className={styles.linkPanelTitle}>Projetos sem cliente vinculado</p>
            {unlinked.length === 0 ? (
              <p className={styles.linkPanelEmpty}>Nenhum projeto disponível.</p>
            ) : (
              <div className={styles.linkList}>
                {unlinked.map((p) => (
                  <div key={p.id} className={styles.linkRow}>
                    <span className={styles.linkTitle}>{p.title}</span>
                    <Badge value={p.status} />
                    <button
                      className={styles.btnPrimary}
                      onClick={() => handleLink(p.id)}
                      disabled={linkBusy === p.id}
                    >
                      {linkBusy === p.id ? '...' : 'Vincular'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lista de projetos do cliente */}
        {client.projects.length === 0 && !showLinkPanel ? (
          <div className={styles.empty}>
            <IconBriefcase size={32} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>Nenhum projeto vinculado</p>
            <p className={styles.emptySub}>Clique em "Adicionar projeto" para vincular</p>
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {client.projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onUnlink={() => handleUnlink(project.id, project.title)}
                onNavigate={() => navigate(`/projects/${project.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Anotações internas ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <IconNote size={15} className={styles.sectionIcon} />
              Anotações internas
            </h2>
            <p className={styles.sectionSub}>Visível só para você — o cliente nunca vê este conteúdo</p>
          </div>
        </div>
        <textarea
          className={styles.notesArea}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex: prefere contato por WhatsApp, paga sempre no dia 10, projeto sensível a prazo…"
          rows={4}
          maxLength={2000}
        />
      </section>

      {/* ── Permissões ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <IconShieldLock size={15} className={styles.sectionIcon} />
              Permissões
            </h2>
            <p className={styles.sectionSub}>Controle o que este cliente enxerga e recebe</p>
          </div>
        </div>
        <PermissionsEditor value={permissions} onChange={setPermissions} />

        <div className={styles.saveBar}>
          {settingsError && <span className={styles.settingsError}>{settingsError}</span>}
          {savedFlash && (
            <span className={styles.savedMsg}>
              <IconCheck size={14} /> Alterações salvas
            </span>
          )}
          <button className={styles.btnPrimary} onClick={handleSaveSettings} disabled={savingSettings}>
            <IconDeviceFloppy size={15} />
            {savingSettings ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </section>
    </div>
  )
}

// ── Card de projeto ───────────────────────────────────────────────
function ProjectCard({
  project, onUnlink, onNavigate,
}: {
  project: ProjectSummary
  onUnlink: () => void
  onNavigate: () => void
}) {
  return (
    <div className={styles.projectCard}>
      <div className={styles.projectCardTop}>
        <button className={styles.projectTitle} onClick={onNavigate}>
          {project.title}
        </button>
        <button
          className={styles.btnUnlink}
          onClick={onUnlink}
          title="Remover vínculo"
        >
          <IconUnlink size={14} />
        </button>
      </div>

      <Badge value={project.status} />

      <div className={styles.projectMeta}>
        <div className={styles.progressRow}>
          <ProgressBar percent={project.progress} height={5} />
          <span className={styles.progressPct}>{project.progress}%</span>
        </div>
        <div className={styles.metaFooter}>
          <span>{formatTime(project.totalTime)}</span>
          {project.deadline && <span>Prazo: {formatDate(project.deadline)}</span>}
        </div>
      </div>
    </div>
  )
}
