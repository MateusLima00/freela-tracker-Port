import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconUsers, IconPlus, IconTrash, IconEye, IconEyeOff,
  IconChevronRight, IconBriefcase, IconRefresh, IconCopy, IconCheck,
} from '@tabler/icons-react'
import { adminClientService } from '../../../services/adminClient.service'
import { projectService } from '../../../services/project.service'
import type { IClientWithCount } from '../../../services/adminClient.service'
import type { IProject, IClientPermissions } from '../../../interfaces'
import { formatDate } from '../../../utils/format'
import { apiErrorMessage } from '../../../utils/apiError'
import { DEFAULT_CLIENT_PERMISSIONS } from '../../../utils/constants'
import { PermissionsEditor } from '../../../components/PermissionsEditor/PermissionsEditor'
import styles from './ClientsPage.module.css'

// ── Componente principal ──────────────────────────────────────────
export function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<IClientWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [showModal, setShowModal] = useState(false)

  function load() {
    setIsLoading(true)
    adminClientService.list()
      .then((res) => setClients(res.data.data))
      .catch(() => setError('Erro ao carregar clientes.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover o cliente "${name}"? Os projetos dele ficarão sem cliente.`)) return
    setDeleteError('')
    try {
      await adminClientService.delete(id)
      setClients((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setDeleteError(apiErrorMessage(err, 'Erro ao remover cliente.'))
    }
  }

  if (isLoading) return <p className="pageState">Carregando...</p>
  if (error)     return <p className="pageState pageStateError">{error}</p>

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Clientes</h1>
          <p className={styles.pageSub}>{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
          <IconPlus size={16} />
          Novo Cliente
        </button>
      </div>

      {deleteError && <p className="errorBanner">{deleteError}</p>}

      {/* ── Tabela ── */}
      {clients.length === 0 ? (
        <div className={styles.empty}>
          <IconUsers size={40} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nenhum cliente ainda</p>
          <p className={styles.emptySub}>Crie o primeiro cliente para vincular projetos</p>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            <IconPlus size={15} /> Criar primeiro cliente
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Cliente</span>
            <span>Email</span>
            <span>Projetos</span>
            <span>Cadastro</span>
            <span />
          </div>

          {clients.map((client) => (
            <div key={client.id} className={styles.tableRow}>
              {/* Avatar + nome */}
              <div className={styles.clientCell}>
                <div className={styles.avatar}>
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <span className={styles.clientName}>{client.name}</span>
              </div>

              <span className={styles.clientEmail}>{client.email}</span>

              {/* Contador de projetos */}
              <div className={styles.projectCount}>
                <IconBriefcase size={14} />
                <span>{client._count.projects}</span>
              </div>

              <span className={styles.clientDate}>{formatDate(client.createdAt)}</span>

              {/* Ações */}
              <div className={styles.actions}>
                <button
                  className={styles.btnIcon}
                  title="Ver detalhes"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <IconChevronRight size={16} />
                </button>
                <button
                  className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                  title="Remover cliente"
                  onClick={() => handleDelete(client.id, client.name)}
                >
                  <IconTrash size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <CreateClientModal
          onClose={() => setShowModal(false)}
          onCreated={(client) => {
            setClients((prev) => [client, ...prev])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

// ── Gerador de senha segura ──────────────────────────────────────
function generatePassword(): string {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower   = 'abcdefghijklmnopqrstuvwxyz'
  const digits  = '0123456789'
  const special = '!@#$%^&*'
  const all     = upper + lower + digits + special
  let pwd = ''
  pwd += upper[Math.floor(Math.random() * upper.length)]
  pwd += lower[Math.floor(Math.random() * lower.length)]
  pwd += digits[Math.floor(Math.random() * digits.length)]
  pwd += special[Math.floor(Math.random() * special.length)]
  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)]
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

// ── Modal de criação ──────────────────────────────────────────────
interface CreateClientModalProps {
  onClose: () => void
  onCreated: (client: IClientWithCount) => void
}

function CreateClientModal({ onClose, onCreated }: CreateClientModalProps) {
  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [projects, setProjects]       = useState<IProject[]>([])
  const [selected, setSelected]       = useState<string[]>([])
  const [isBusy, setIsBusy]           = useState(false)
  const [formError, setFormError]     = useState('')
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [createdClient, setCreatedClient] = useState<IClientWithCount | null>(null)
  const [permissions, setPermissions] = useState<IClientPermissions>(DEFAULT_CLIENT_PERMISSIONS)

  useEffect(() => {
    projectService.getAll()
      .then((res) => setProjects(res.data.data))
      .catch(() => {})
  }, [])

  function toggleProject(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function handleGenerate() {
    const pwd = generatePassword()
    setPassword(pwd)
    setConfirm(pwd)
    setShowPwd(true)
  }

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')

    if (password !== confirm) {
      setFormError('As senhas não coincidem.')
      return
    }

    setIsBusy(true)
    try {
      const res = await adminClientService.create({ firstName, lastName, email, password, permissions, projectIds: selected })
      const client = { ...res.data.data, _count: { projects: selected.length } } as IClientWithCount
      setCreatedClient(client)
      setCredentials({ email, password })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar cliente.')
    } finally {
      setIsBusy(false)
    }
  }

  /* ── Tela de credenciais após criação ── */
  if (credentials && createdClient) {
    return (
      <div className={styles.overlay} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>✓ Cliente criado!</h2>
          </div>
          <div className={styles.form}>
            <p className={styles.credDesc}>
              Guarde as credenciais abaixo antes de fechar — a senha não será exibida novamente.
            </p>
            <div className={styles.credBlock}>
              <div className={styles.credRow}>
                <span className={styles.credLabel}>Email</span>
                <span className={styles.credValue}>{credentials.email}</span>
                <button
                  type="button"
                  className={styles.btnCopy}
                  onClick={() => copyToClipboard(credentials.email, 'email')}
                >
                  {copiedField === 'email' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </button>
              </div>
              <div className={styles.credRow}>
                <span className={styles.credLabel}>Senha</span>
                <span className={styles.credValue}>{credentials.password}</span>
                <button
                  type="button"
                  className={styles.btnCopy}
                  onClick={() => copyToClipboard(credentials.password, 'pwd')}
                >
                  {copiedField === 'pwd' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                </button>
              </div>
            </div>
            <div className={styles.formFooter}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => onCreated(createdClient)}
              >
                Fechar e continuar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Novo Cliente</h2>
          <button className={styles.btnClose} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Nome + sobrenome */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Nome</label>
              <input
                className={styles.input}
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="João"
                required
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Sobrenome</label>
              <input
                className={styles.input}
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Silva"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@email.com"
              required
            />
          </div>

          {/* Senha */}
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Senha inicial</label>
              <button
                type="button"
                className={styles.btnGenerate}
                onClick={handleGenerate}
              >
                <IconRefresh size={13} /> Gerar senha
              </button>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.inputWrap}>
                <input
                  className={styles.input}
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mín. 8 chars, maiúsc., nº e especial"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                >
                  {showPwd ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              <div className={styles.inputWrap}>
                <input
                  className={styles.input}
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirmar senha"
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Projetos */}
          {projects.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Vincular projetos (opcional)</label>
              <div className={styles.projectList}>
                {projects.map((p) => (
                  <label key={p.id} className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkLabel}>{p.title}</span>
                    {p.client && (
                      <span className={styles.checkSub}>(atual: {p.client.name})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Permissões do portal */}
          <div className={styles.field}>
            <label className={styles.label}>Permissões de acesso</label>
            <PermissionsEditor value={permissions} onChange={setPermissions} />
          </div>

          {formError && <p className={styles.formError}>{formError}</p>}

          <div className={styles.formFooter}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isBusy}>
              {isBusy ? 'Criando...' : 'Criar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
