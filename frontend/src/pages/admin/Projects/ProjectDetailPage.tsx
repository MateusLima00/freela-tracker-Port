import { useEffect, useState, useRef } from 'react'
import type { FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconDots, IconPencil, IconArchive, IconArchiveOff, IconTrash,
} from '@tabler/icons-react'
import { projectService } from '../../../services/project.service'
import { updateService } from '../../../services/update.service'
import type { IProject, IProjectUpdate } from '../../../interfaces'
import { TaskStatus, ProjectStatus } from '../../../enums'
import { Badge } from '../../../components/Badge/Badge'
import { TimerWidget } from '../../../components/TimerWidget/TimerWidget'
import { FinancialAdmin } from '../../../components/Financial/FinancialAdmin'
import { DeliveriesAdmin } from '../../../components/Deliveries/DeliveriesAdmin'
import { ProjectEmails } from '../../../components/Email/ProjectEmails'
import { SessionHistory } from '../../../components/Timer/SessionHistory'
import { TasksSection } from '../../../components/Tasks/TasksSection'
import { formatTime, formatDate, formatDateTime } from '../../../utils/format'
import { apiErrorMessage } from '../../../utils/apiError'
import styles from './ProjectDetailPage.module.css'

const STATUS_OPTIONS = [
  { value: ProjectStatus.PENDING,         label: 'Pendente' },
  { value: ProjectStatus.IN_PROGRESS,     label: 'Em andamento' },
  { value: ProjectStatus.AWAITING_CLIENT, label: 'Aguardando cliente' },
  { value: ProjectStatus.COMPLETED,       label: 'Concluído' },
  { value: ProjectStatus.PAUSED,          label: 'Pausado' },
]

/* ── component ── */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  const [project,     setProject]     = useState<IProject | null>(null)
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState('')

  /* action menu */
  const [showMenu, setShowMenu] = useState(false)
  const [archiveError, setArchiveError] = useState('') // erro de arquivar/desarquivar (banner)

  /* erros inline dos forms/modais */
  const [editError,   setEditError]   = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [updateError, setUpdateError] = useState('')

  /* edit modal */
  const [showEditModal,  setShowEditModal]  = useState(false)
  const [editTitle,      setEditTitle]      = useState('')
  const [editDesc,       setEditDesc]       = useState('')
  const [editStatus,     setEditStatus]     = useState<ProjectStatus>(ProjectStatus.PENDING)
  const [editProgress,   setEditProgress]   = useState(0)
  const [editDeadline,   setEditDeadline]   = useState('')
  const [editEstimated,  setEditEstimated]  = useState('')
  const [editBusy,       setEditBusy]       = useState(false)

  /* delete modal */
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInput,     setDeleteInput]     = useState('')
  const [deleteBusy,      setDeleteBusy]      = useState(false)

  /* update form */
  const [showUpdateForm,  setShowUpdateForm]  = useState(false)
  const [editingUpdate,   setEditingUpdate]   = useState<IProjectUpdate | null>(null)
  const [upTitle,         setUpTitle]         = useState('')
  const [upContent,       setUpContent]       = useState('')
  const [updateBusy,      setUpdateBusy]      = useState(false)

  /* close menu on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  /* load */
  useEffect(() => {
    if (!id) return
    projectService.getById(id)
      .then((pRes) => setProject(pRes.data.data))
      .catch(() => setError('Erro ao carregar projeto.'))
      .finally(() => setIsLoading(false))
  }, [id])

  // Recarrega o projeto após o timer mudar (totalTime e feed de updates mudam no stop)
  async function reloadProject() {
    if (!id) return
    try {
      const res = await projectService.getById(id)
      setProject(res.data.data)
    } catch { /* mantém estado atual em caso de falha */ }
  }

  /* ── project action handlers ── */
  function openEdit() {
    if (!project) return
    setEditTitle(project.title)
    setEditDesc(project.description ?? '')
    setEditStatus(
      project.status === ProjectStatus.ARCHIVED ? ProjectStatus.PAUSED : project.status
    )
    setEditProgress(project.progress)
    setEditDeadline(project.deadline ? project.deadline.split('T')[0] : '')
    setEditEstimated(project.estimatedHours != null ? String(project.estimatedHours) : '')
    setEditError('')
    setShowMenu(false)
    setShowEditModal(true)
  }

  async function handleEditSave() {
    if (!id || !editTitle.trim()) return
    setEditBusy(true)
    setEditError('')
    try {
      const res = await projectService.update(id, {
        title:       editTitle.trim(),
        description: editDesc.trim() || undefined,
        status:      editStatus,
        progress:    editProgress,
        deadline:    editDeadline
          ? new Date(editDeadline + 'T12:00:00').toISOString()
          : null,
        estimatedHours: editEstimated.trim() === '' ? null : Number(editEstimated),
      })
      setProject(res.data.data)
      setShowEditModal(false)
    } catch (err) {
      setEditError(apiErrorMessage(err, 'Erro ao salvar projeto.'))
    } finally {
      setEditBusy(false)
    }
  }

  async function handleArchive() {
    if (!id || !project) return
    setShowMenu(false)
    setArchiveError('')
    const isArchived = project.status === ProjectStatus.ARCHIVED
    try {
      if (isArchived) {
        const res = await projectService.update(id, { status: ProjectStatus.PAUSED })
        setProject(res.data.data)
      } else {
        await projectService.update(id, { status: ProjectStatus.ARCHIVED })
        navigate('/projects')
      }
    } catch (err) {
      setArchiveError(apiErrorMessage(err, 'Erro ao arquivar projeto.'))
    }
  }

  async function handleDeleteProject() {
    if (!id || deleteInput !== project?.title) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await projectService.delete(id)
      navigate('/projects')
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Erro ao excluir projeto.'))
      setDeleteBusy(false)
    }
  }

  /* ── update handlers ── */
  async function handleCreateUpdate(e: FormEvent) {
    e.preventDefault()
    if (!id || !upTitle.trim() || !upContent.trim()) return
    setUpdateBusy(true)
    setUpdateError('')
    try {
      const res = await updateService.create({
        projectId: id,
        title:     upTitle.trim(),
        content:   upContent.trim(),
      })
      setProject((p) => p ? { ...p, updates: [res.data.data, ...p.updates] } : p)
      setUpTitle('')
      setUpContent('')
      setShowUpdateForm(false)
    } catch (err) {
      setUpdateError(apiErrorMessage(err, 'Erro ao publicar atualização.'))
    } finally {
      setUpdateBusy(false)
    }
  }

  function handleStartEditUpdate(update: IProjectUpdate) {
    setEditingUpdate(update)
    setUpTitle(update.title)
    setUpContent(update.content)
    setShowUpdateForm(false)
    setUpdateError('')
  }

  function handleCancelEditUpdate() {
    setEditingUpdate(null)
    setUpTitle('')
    setUpContent('')
    setUpdateError('')
  }

  async function handleSaveEditUpdate() {
    if (!editingUpdate) return
    setUpdateBusy(true)
    setUpdateError('')
    try {
      const res = await updateService.update(editingUpdate.id, {
        title:   upTitle.trim(),
        content: upContent.trim(),
      })
      setProject((p) =>
        p ? { ...p, updates: p.updates.map((u) => u.id === editingUpdate.id ? res.data.data : u) } : p
      )
      handleCancelEditUpdate()
    } catch (err) {
      setUpdateError(apiErrorMessage(err, 'Erro ao editar atualização.'))
    } finally {
      setUpdateBusy(false)
    }
  }

  async function handleDeleteUpdate(updateId: string) {
    if (!confirm('Deletar esta atualização?')) return
    setUpdateError('')
    try {
      await updateService.delete(updateId)
      setProject((p) => p ? { ...p, updates: p.updates.filter((u) => u.id !== updateId) } : p)
    } catch (err) {
      setUpdateError(apiErrorMessage(err, 'Erro ao deletar atualização.'))
    }
  }

  /* ── render ── */
  if (isLoading) return <p className="pageState">Carregando...</p>
  if (error || !project) return <p className="pageState pageStateError">{error || 'Projeto não encontrado.'}</p>

  const tasksDone = project.tasks.filter((t) => t.status === TaskStatus.DONE).length

  return (
    <div className={styles.page}>

      {/* Breadcrumb */}
      <button onClick={() => navigate('/projects')} className={styles.back}>
        ← Projetos
      </button>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{project.title}</h1>
          {project.description && <p className={styles.desc}>{project.description}</p>}
          <p className={styles.clientLine}>
            {project.client
              ? <>Cliente: <strong>{project.client.name}</strong></>
              : <span>Sem cliente</span>}
            {project.deadline && <> · Deadline: <strong>{formatDate(project.deadline)}</strong></>}
          </p>
        </div>

        <div className={styles.headerRight}>
          <Badge value={project.status} />
          <div ref={menuRef} className={styles.menuWrapper}>
            <button
              className={styles.btnMenu}
              onClick={() => setShowMenu((v) => !v)}
              title="Ações do projeto"
            >
              <IconDots size={18} />
            </button>
            {showMenu && (
              <div className={styles.dropdown}>
                <button className={styles.dropdownItem} onClick={openEdit}>
                  <IconPencil size={14} /> Editar
                </button>
                <button className={styles.dropdownItem} onClick={handleArchive}>
                  {project.status === ProjectStatus.ARCHIVED
                    ? <><IconArchiveOff size={14} /> Desarquivar</>
                    : <><IconArchive size={14} /> Arquivar</>}
                </button>
                <div className={styles.dropdownDivider} />
                <button
                  className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                  onClick={() => { setShowMenu(false); setDeleteInput(''); setDeleteError(''); setShowDeleteModal(true) }}
                >
                  <IconTrash size={14} /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {archiveError && <p className="errorBanner">{archiveError}</p>}

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <Stat label="Tempo total" value={formatTime(project.totalTime)} />
        <div className={styles.statsDivider} />
        <Stat label="Progresso" value={`${project.progress}%`} />
        <div className={styles.statsDivider} />
        <Stat label="Tarefas" value={`${tasksDone} / ${project.tasks.length}`} />
      </div>

      {/* Timer */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Timer</h2>
        <TimerWidget fixedProjectId={id} onChange={reloadProject} />
      </section>

      {/* Financeiro */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Financeiro</h2>
        {id && <FinancialAdmin projectId={id} />}
      </section>

      {/* Entregas (Fase 7) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Entregas</h2>
        {id && <DeliveriesAdmin projectId={id} />}
      </section>

      {/* Tasks */}
      {id && (
        <TasksSection
          projectId={id}
          tasks={project.tasks}
          onTasksChange={reloadProject}
        />
      )}

      {/* Updates */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Atualizações</h2>
          {!editingUpdate && (
            <button
              onClick={() => { setShowUpdateForm((v) => !v); setUpTitle(''); setUpContent(''); setUpdateError('') }}
              className={styles.btnSecondary}
            >
              {showUpdateForm ? 'Cancelar' : '+ Nova atualização'}
            </button>
          )}
        </div>

        {showUpdateForm && !editingUpdate && (
          <form onSubmit={handleCreateUpdate} className={styles.stackForm}>
            <input
              type="text"
              value={upTitle}
              onChange={(e) => setUpTitle(e.target.value)}
              className={styles.input}
              placeholder="Título (ex: Entrega da fase 1)"
              required
              autoFocus
            />
            <textarea
              value={upContent}
              onChange={(e) => setUpContent(e.target.value)}
              className={styles.textarea}
              placeholder="Descreva o que foi feito..."
              rows={3}
              required
            />
            <div className={styles.formFooter}>
              <button type="submit" disabled={updateBusy} className={styles.btnPrimary}>
                {updateBusy ? '...' : 'Publicar'}
              </button>
            </div>
          </form>
        )}

        {editingUpdate && (
          <div className={styles.stackForm}>
            <input
              type="text"
              value={upTitle}
              onChange={(e) => setUpTitle(e.target.value)}
              className={styles.input}
              autoFocus
            />
            <textarea
              value={upContent}
              onChange={(e) => setUpContent(e.target.value)}
              className={styles.textarea}
              rows={3}
            />
            <div className={styles.formFooter}>
              <button onClick={handleCancelEditUpdate} className={styles.btnGhost}>Cancelar</button>
              <button onClick={handleSaveEditUpdate} disabled={updateBusy} className={styles.btnPrimary}>
                {updateBusy ? '...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {updateError && <p className={styles.errorMsg}>{updateError}</p>}

        {project.updates.length === 0 && !showUpdateForm && !editingUpdate && (
          <p className={styles.empty}>Nenhuma atualização publicada.</p>
        )}

        <div className={styles.timeline}>
          {project.updates.map((update) => (
            <div key={update.id} className={styles.updateCard}>
              <div className={styles.updateTop}>
                <div>
                  <p className={styles.updateTitle}>{update.title}</p>
                  <p className={styles.updateDate}>{formatDateTime(update.createdAt)}</p>
                </div>
                <div className={styles.updateActions}>
                  <button onClick={() => handleStartEditUpdate(update)} className={styles.btnGhost}>Editar</button>
                  <button onClick={() => handleDeleteUpdate(update.id)} className={styles.btnDelete}>×</button>
                </div>
              </div>
              <p className={styles.updateContent}>{update.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Histórico de sessões do timer (Fase 10) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Histórico de sessões</h2>
        {id && <SessionHistory projectId={id} projectTitle={project.title} />}
      </section>

      {/* E-mails (Fase 8) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>E-mails</h2>
        {id && <ProjectEmails projectId={id} hasClient={!!project.client} />}
      </section>

      {/* Edit Modal */}
      {showEditModal && (
        <div className={styles.overlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Editar projeto</h2>
              <button className={styles.btnClose} onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.field}>
                <label className={styles.label}>Título *</label>
                <input
                  className={styles.input}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Descrição</label>
                <textarea
                  className={styles.textarea}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Status</label>
                  <select
                    className={styles.select}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Progresso: {editProgress}%</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className={styles.range}
                  />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Deadline</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Estimativa de horas</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    className={styles.input}
                    value={editEstimated}
                    onChange={(e) => setEditEstimated(e.target.value)}
                    placeholder="Ex: 40"
                  />
                </div>
              </div>
              {editError && <p className={styles.errorMsg}>{editError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setShowEditModal(false)}>
                Cancelar
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleEditSave}
                disabled={editBusy || !editTitle.trim()}
              >
                {editBusy ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.overlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Excluir projeto</h2>
              <button className={styles.btnClose} onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.deleteWarning}>
                Esta ação é <strong>irreversível</strong>. Todos os dados do projeto — tarefas,
                histórico do timer e atualizações — serão excluídos permanentemente.
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Digite <strong className={styles.highlight}>{project.title}</strong> para confirmar:
                </label>
                <input
                  className={styles.input}
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={project.title}
                  autoFocus
                />
              </div>
              {deleteError && <p className={styles.errorMsg}>{deleteError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </button>
              <button
                className={styles.btnDanger}
                onClick={handleDeleteProject}
                disabled={deleteBusy || deleteInput !== project.title}
              >
                {deleteBusy ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── helper component ── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
    </div>
  )
}
