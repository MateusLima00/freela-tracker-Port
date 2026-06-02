import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconPlus, IconArchive, IconArchiveOff, IconTrash, IconFolder,
} from '@tabler/icons-react'
import { projectService } from '../../../services/project.service'
import { adminClientService } from '../../../services/adminClient.service'
import type { IProject } from '../../../interfaces'
import type { IClientWithCount } from '../../../services/adminClient.service'
import { Badge } from '../../../components/Badge/Badge'
import { ProgressBar } from '../../../components/ProgressBar/ProgressBar'
import { formatDate } from '../../../utils/format'
import { apiErrorMessage } from '../../../utils/apiError'
import { ProjectStatus } from '../../../enums'
import styles from './ProjectsPage.module.css'

type Tab = 'active' | 'archived'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects,        setProjects]        = useState<IProject[]>([])
  const [isLoading,       setIsLoading]       = useState(true)
  const [error,           setError]           = useState('')
  const [tab,             setTab]             = useState<Tab>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null)
  const [deleteInput,     setDeleteInput]     = useState('')
  const [deleteBusy,      setDeleteBusy]      = useState(false)
  const [actionError,     setActionError]     = useState('') // erro de arquivar (linha)
  const [deleteError,     setDeleteError]     = useState('') // erro de exclusão (modal)

  useEffect(() => {
    projectService.getAll()
      .then((res) => setProjects(res.data.data))
      .catch(() => setError('Erro ao carregar projetos.'))
      .finally(() => setIsLoading(false))
  }, [])

  const active   = projects.filter((p) => p.status !== ProjectStatus.ARCHIVED)
  const archived = projects.filter((p) => p.status === ProjectStatus.ARCHIVED)
  const displayed = tab === 'active' ? active : archived

  async function handleArchiveToggle(project: IProject, e: React.MouseEvent) {
    e.stopPropagation()
    const isArchived = project.status === ProjectStatus.ARCHIVED
    setActionError('')
    try {
      const res = await projectService.update(project.id, {
        status: isArchived ? ProjectStatus.PAUSED : ProjectStatus.ARCHIVED,
      })
      setProjects((prev) => prev.map((p) => p.id === project.id ? res.data.data : p))
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Erro ao arquivar projeto.'))
    }
  }

  function openDeleteModal(project: IProject, e: React.MouseEvent) {
    e.stopPropagation()
    setProjectToDelete(project)
    setDeleteInput('')
    setDeleteError('')
  }

  async function handleDelete() {
    if (!projectToDelete || deleteInput !== projectToDelete.title) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await projectService.delete(projectToDelete.id)
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id))
      setProjectToDelete(null)
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Erro ao excluir projeto.'))
    } finally {
      setDeleteBusy(false)
    }
  }

  if (isLoading) return <p className="pageState">Carregando...</p>
  if (error)     return <p className="pageState pageStateError">{error}</p>

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Projetos</h1>
          <p className={styles.sub}>
            {active.length} ativo{active.length !== 1 ? 's' : ''}
            {archived.length > 0 && ` · ${archived.length} arquivado${archived.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>
          <IconPlus size={16} /> Novo projeto
        </button>
      </div>

      {actionError && <p className="errorBanner">{actionError}</p>}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`}
          onClick={() => setTab('active')}
        >
          Ativos <span className={styles.tabCount}>{active.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'archived' ? styles.tabActive : ''}`}
          onClick={() => setTab('archived')}
        >
          Arquivados <span className={styles.tabCount}>{archived.length}</span>
        </button>
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className={styles.empty}>
          <IconFolder size={36} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>
            {tab === 'active' ? 'Nenhum projeto ativo' : 'Nenhum projeto arquivado'}
          </p>
          <p className={styles.emptySub}>
            {tab === 'active'
              ? 'Crie o primeiro projeto para começar.'
              : 'Projetos arquivados aparecem aqui.'}
          </p>
          {tab === 'active' && (
            <button className={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>
              <IconPlus size={15} /> Criar projeto
            </button>
          )}
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Projeto</span>
            <span>Cliente</span>
            <span>Status</span>
            <span>Progresso</span>
            <span>Deadline</span>
            <span />
          </div>

          {displayed.map((project) => (
            <div
              key={project.id}
              className={styles.tableRow}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div>
                <p className={styles.projectName}>{project.title}</p>
                {project.description && (
                  <p className={styles.projectDesc}>{project.description}</p>
                )}
              </div>

              <span className={styles.clientName}>{project.client?.name ?? '—'}</span>

              <Badge value={project.status} />

              <div className={styles.progressWrap}>
                <ProgressBar percent={project.progress} height={5} className={styles.progressFlex} />
                <span className={styles.progressText}>{project.progress}%</span>
              </div>

              <span className={styles.deadline}>
                {project.deadline ? formatDate(project.deadline) : '—'}
              </span>

              <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                <button
                  className={styles.btnRowAction}
                  title={project.status === ProjectStatus.ARCHIVED ? 'Desarquivar' : 'Arquivar'}
                  onClick={(e) => handleArchiveToggle(project, e)}
                >
                  {project.status === ProjectStatus.ARCHIVED
                    ? <IconArchiveOff size={14} />
                    : <IconArchive size={14} />}
                </button>
                <button
                  className={`${styles.btnRowAction} ${styles.btnRowActionDanger}`}
                  title="Excluir"
                  onClick={(e) => openDeleteModal(project, e)}
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(project) => {
            setShowCreateModal(false)
            navigate(`/projects/${project.id}`)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className={styles.overlay} onClick={() => setProjectToDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Excluir projeto</h2>
              <button className={styles.btnClose} onClick={() => setProjectToDelete(null)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.deleteWarning}>
                Esta ação é <strong>irreversível</strong>. Todos os dados do projeto serão
                excluídos permanentemente.
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Digite <strong>{projectToDelete.title}</strong> para confirmar:
                </label>
                <input
                  className={styles.input}
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={projectToDelete.title}
                  autoFocus
                />
              </div>
              {deleteError && <p className={styles.formError}>{deleteError}</p>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setProjectToDelete(null)}>
                Cancelar
              </button>
              <button
                className={styles.btnDanger}
                onClick={handleDelete}
                disabled={deleteBusy || deleteInput !== projectToDelete.title}
              >
                {deleteBusy ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Create Project Modal ── */
interface CreateProjectModalProps {
  onClose: () => void
  onCreated: (project: IProject) => void
}

function CreateProjectModal({ onClose, onCreated }: CreateProjectModalProps) {
  const [title,     setTitle]     = useState('')
  const [desc,      setDesc]      = useState('')
  const [clientId,  setClientId]  = useState('')
  const [deadline,  setDeadline]  = useState('')
  const [clients,   setClients]   = useState<IClientWithCount[]>([])
  const [isBusy,    setIsBusy]    = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    adminClientService.list()
      .then((res) => setClients(res.data.data))
      .catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setFormError('')
    setIsBusy(true)
    try {
      const res = await projectService.create({
        title:       title.trim(),
        description: desc.trim() || undefined,
        clientId:    clientId || undefined,
        deadline:    deadline ? new Date(deadline + 'T12:00:00').toISOString() : undefined,
      })
      onCreated(res.data.data)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar projeto.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Novo projeto</h2>
          <button className={styles.btnClose} onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.label}>Título *</label>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Site institucional"
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Descrição</label>
            <textarea
              className={styles.textarea}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descrição opcional..."
              rows={3}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Cliente (opcional)</label>
              <select
                className={styles.select}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Sem cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Deadline</label>
              <input
                type="date"
                className={styles.input}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {formError && <p className={styles.formError}>{formError}</p>}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isBusy || !title.trim()}>
              {isBusy ? 'Criando...' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
