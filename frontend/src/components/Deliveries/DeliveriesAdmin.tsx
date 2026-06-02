import { useEffect, useState, useRef } from 'react'
import type { FormEvent } from 'react'
import {
  IconPlus, IconUpload, IconTrash, IconLock, IconLockOpen, IconPhoto,
} from '@tabler/icons-react'
import { deliveryService } from '../../services/delivery.service'
import type { IDelivery } from '../../interfaces'
import { Badge } from '../Badge/Badge'
import { formatDateTime } from '../../utils/format'
import { apiErrorMessage } from '../../utils/apiError'
import styles from './DeliveriesAdmin.module.css'

// Painel de gestão de entregas no detalhe do projeto (admin).
// Lista entregas com histórico de versões, permite criar, subir novas versões,
// desbloquear entregas aprovadas e excluir.
export function DeliveriesAdmin({ projectId }: { projectId: string }) {
  const [deliveries, setDeliveries] = useState<IDelivery[]>([])
  const [loading, setLoading] = useState(true)

  /* formulário de nova entrega */
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [creating, setCreating] = useState(false)
  const createInputRef = useRef<HTMLInputElement>(null)

  /* upload de nova versão (por entrega) */
  const [versionBusyId, setVersionBusyId] = useState<string | null>(null)

  /* erros inline — escopo do formulário de criação e por card (keyed por deliveryId) */
  const [createError, setCreateError] = useState('')
  const [cardError, setCardError] = useState<Record<string, string>>({})

  function load() {
    deliveryService.listByProject(projectId)
      .then((res) => setDeliveries(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await deliveryService.create(
        projectId,
        { title: title.trim(), description: description.trim() || undefined },
        files,
      )
      setDeliveries((d) => [res.data.data, ...d])
      setTitle(''); setDescription(''); setFiles([]); setShowForm(false)
      if (createInputRef.current) createInputRef.current.value = ''
    } catch (err) {
      setCreateError(apiErrorMessage(err, 'Erro ao criar entrega.'))
    } finally {
      setCreating(false)
    }
  }

  async function handleAddVersion(deliveryId: string, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setVersionBusyId(deliveryId)
    try {
      const res = await deliveryService.addVersion(deliveryId, Array.from(fileList))
      setDeliveries((d) => d.map((item) => item.id === deliveryId ? res.data.data : item))
    } catch (err) {
      setCardError((prev) => ({ ...prev, [deliveryId]: apiErrorMessage(err, 'Erro ao subir nova versão.') }))
    } finally {
      setVersionBusyId(null)
    }
  }

  async function handleUnlock(deliveryId: string) {
    if (!confirm('Desbloquear esta entrega? O cliente poderá revisá-la novamente.')) return
    try {
      const res = await deliveryService.unlock(deliveryId)
      setDeliveries((d) => d.map((item) => item.id === deliveryId ? res.data.data : item))
    } catch (err) {
      setCardError((prev) => ({ ...prev, [deliveryId]: apiErrorMessage(err, 'Erro ao desbloquear.') }))
    }
  }

  async function handleDelete(deliveryId: string) {
    if (!confirm('Excluir esta entrega e todas as suas imagens? Ação irreversível.')) return
    try {
      await deliveryService.delete(deliveryId)
      setDeliveries((d) => d.filter((item) => item.id !== deliveryId))
    } catch (err) {
      setCardError((prev) => ({ ...prev, [deliveryId]: apiErrorMessage(err, 'Erro ao excluir entrega.') }))
    }
  }

  if (loading) return <p className={styles.loading}>Carregando entregas...</p>

  return (
    <div className={styles.wrap}>
      {/* Cabeçalho + botão nova entrega */}
      <div className={styles.header}>
        <button
          className={styles.btnSecondary}
          onClick={() => { setShowForm((v) => !v); setTitle(''); setDescription(''); setFiles([]); setCreateError('') }}
        >
          {showForm ? 'Cancelar' : <><IconPlus size={15} /> Nova entrega</>}
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <form onSubmit={handleCreate} className={styles.form}>
          <input
            className={styles.input}
            placeholder="Título da entrega (ex: Home page v1)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />
          <textarea
            className={styles.textarea}
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <label className={styles.fileLabel}>
            <IconPhoto size={16} />
            {files.length > 0 ? `${files.length} imagem(ns) selecionada(s)` : 'Selecionar imagens'}
            <input
              ref={createInputRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.fileInput}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          <div className={styles.formFooter}>
            <button type="submit" className={styles.btnPrimary} disabled={creating || !title.trim()}>
              {creating ? 'Enviando...' : 'Criar entrega'}
            </button>
          </div>
          {createError && <p className={styles.errorMsg}>{createError}</p>}
        </form>
      )}

      {/* Lista de entregas */}
      {deliveries.length === 0 && !showForm && (
        <p className={styles.empty}>Nenhuma entrega criada ainda.</p>
      )}

      <div className={styles.list}>
        {deliveries.map((delivery) => {
          const latest = delivery.versions[0]
          const isLocked = delivery.lockedAt !== null
          return (
            <div key={delivery.id} className={styles.card}>
              {/* Topo do card */}
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.cardTitle}>{delivery.title}</p>
                  {delivery.description && <p className={styles.cardDesc}>{delivery.description}</p>}
                </div>
                <div className={styles.cardActions}>
                  <Badge value={delivery.status} />
                  {isLocked ? (
                    <button className={styles.iconBtn} title="Desbloquear" onClick={() => handleUnlock(delivery.id)}>
                      <IconLock size={15} />
                    </button>
                  ) : (
                    <span className={styles.iconBtnGhost} title="Aberta para revisão">
                      <IconLockOpen size={15} />
                    </span>
                  )}
                  <button className={styles.iconBtnDanger} title="Excluir" onClick={() => handleDelete(delivery.id)}>
                    <IconTrash size={15} />
                  </button>
                </div>
              </div>

              {/* Feedback mais recente do cliente (se houver) */}
              {latest?.feedback && (
                <div className={styles.feedback}>
                  <strong>Feedback do cliente:</strong> {latest.feedback}
                </div>
              )}

              {/* Versões (histórico) */}
              <div className={styles.versions}>
                {delivery.versions.map((version) => (
                  <div key={version.id} className={styles.version}>
                    <div className={styles.versionHead}>
                      <span className={styles.versionTag}>v{version.versionNumber}</span>
                      <span className={styles.versionDate}>{formatDateTime(version.createdAt)}</span>
                    </div>
                    {version.images.length > 0 ? (
                      <div className={styles.thumbs}>
                        {version.images.map((src) => (
                          <a key={src} href={src} target="_blank" rel="noreferrer" className={styles.thumb}>
                            <img src={src} alt={`Imagem da versão ${version.versionNumber}`} loading="lazy" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noImg}>Sem imagens nesta versão.</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Erro de ação inline (unlock, delete, nova versão) */}
              {cardError[delivery.id] && (
                <p className={styles.errorMsg}>{cardError[delivery.id]}</p>
              )}

              {/* Subir nova versão — bloqueado quando a entrega está aprovada */}
              {!isLocked && (
                <label className={styles.versionUpload}>
                  <IconUpload size={15} />
                  {versionBusyId === delivery.id ? 'Enviando...' : 'Subir nova versão'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className={styles.fileInput}
                    disabled={versionBusyId === delivery.id}
                    onChange={(e) => { handleAddVersion(delivery.id, e.target.files); e.target.value = '' }}
                  />
                </label>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
