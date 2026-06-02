import { useEffect, useState } from 'react'
import { IconCheck, IconMessage, IconLock } from '@tabler/icons-react'
import { deliveryService } from '../../services/delivery.service'
import type { IDelivery } from '../../interfaces'
import { Badge } from '../Badge/Badge'
import { formatDateTime } from '../../utils/format'
import { apiErrorMessage } from '../../utils/apiError'
import styles from './DeliveriesClient.module.css'

const MIN_FEEDBACK = 20

// Seção de entregas no portal do cliente. `canApprove` controla a exibição dos
// botões de ação (permissão approveDeliveries). A listagem só é renderizada pela
// página quando o cliente tem viewDeliveries.
export function DeliveriesClient({ projectId, canApprove }: { projectId: string; canApprove: boolean }) {
  const [deliveries, setDeliveries] = useState<IDelivery[]>([])
  const [loading, setLoading] = useState(true)

  /* solicitação de alteração */
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  /* erro inline por card (keyed por deliveryId) */
  const [actionError, setActionError] = useState<Record<string, string>>({})

  function load() {
    deliveryService.listForClient(projectId)
      .then((res) => setDeliveries(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  function patchDelivery(updated: IDelivery) {
    setDeliveries((d) => d.map((item) => item.id === updated.id ? updated : item))
  }

  async function handleApprove(deliveryId: string) {
    if (!confirm('Aprovar esta entrega? Após aprovar ela será bloqueada.')) return
    setBusyId(deliveryId)
    try {
      const res = await deliveryService.approve(deliveryId)
      patchDelivery(res.data.data)
    } catch (err) {
      setActionError((prev) => ({ ...prev, [deliveryId]: apiErrorMessage(err, 'Erro ao aprovar.') }))
    } finally {
      setBusyId(null)
    }
  }

  async function handleRequestChanges(deliveryId: string) {
    if (feedback.trim().length < MIN_FEEDBACK) return
    setBusyId(deliveryId)
    try {
      const res = await deliveryService.requestChanges(deliveryId, feedback.trim())
      patchDelivery(res.data.data)
      setFeedbackFor(null); setFeedback('')
    } catch (err) {
      setActionError((prev) => ({ ...prev, [deliveryId]: apiErrorMessage(err, 'Erro ao solicitar alteração.') }))
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <p className={styles.loading}>Carregando entregas...</p>
  if (deliveries.length === 0) return <p className={styles.empty}>Nenhuma entrega disponível ainda.</p>

  return (
    <div className={styles.list}>
      {deliveries.map((delivery) => {
        const latest = delivery.versions[0]
        const isLocked = delivery.lockedAt !== null
        return (
          <div key={delivery.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <p className={styles.cardTitle}>{delivery.title}</p>
                {delivery.description && <p className={styles.cardDesc}>{delivery.description}</p>}
              </div>
              <Badge value={delivery.status} />
            </div>

            {/* Imagens da versão mais recente */}
            {latest?.images.length ? (
              <div className={styles.thumbs}>
                {latest.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className={styles.thumb}>
                    <img src={src} alt={delivery.title} loading="lazy" />
                  </a>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>Sem imagens nesta entrega.</p>
            )}

            <p className={styles.meta}>
              Versão {latest?.versionNumber ?? 1} · {latest ? formatDateTime(latest.createdAt) : ''}
            </p>

            {/* Ações do cliente */}
            {isLocked ? (
              <p className={styles.lockedNote}><IconLock size={14} /> Entrega aprovada e bloqueada.</p>
            ) : canApprove ? (
              feedbackFor === delivery.id ? (
                <div className={styles.feedbackForm}>
                  <textarea
                    className={styles.textarea}
                    placeholder={`Descreva o que precisa mudar (mínimo ${MIN_FEEDBACK} caracteres)`}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                  <div className={styles.feedbackFooter}>
                    <span className={styles.counter}>
                      {feedback.trim().length}/{MIN_FEEDBACK}
                    </span>
                    <div className={styles.actions}>
                      <button
                        className={styles.btnGhost}
                        onClick={() => {
                          setFeedbackFor(null)
                          setFeedback('')
                          setActionError((prev) => { const n = { ...prev }; delete n[delivery.id]; return n })
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        className={styles.btnPrimary}
                        disabled={busyId === delivery.id || feedback.trim().length < MIN_FEEDBACK}
                        onClick={() => handleRequestChanges(delivery.id)}
                      >
                        {busyId === delivery.id ? 'Enviando...' : 'Enviar feedback'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.actions}>
                  <button
                    className={styles.btnChanges}
                    disabled={busyId === delivery.id}
                    onClick={() => { setFeedbackFor(delivery.id); setFeedback('') }}
                  >
                    <IconMessage size={15} /> Solicitar alteração
                  </button>
                  <button
                    className={styles.btnApprove}
                    disabled={busyId === delivery.id}
                    onClick={() => handleApprove(delivery.id)}
                  >
                    <IconCheck size={15} /> Aprovar
                  </button>
                </div>
              )
            ) : null}

            {/* Erro de ação inline (aprovar / solicitar alteração) */}
            {actionError[delivery.id] && (
              <p className={styles.errorMsg}>{actionError[delivery.id]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
