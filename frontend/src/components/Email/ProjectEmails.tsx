import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { IconMail, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react'
import { emailService } from '../../services/email.service'
import type { IEmailLog } from '../../interfaces'
import { formatDateTime } from '../../utils/format'
import { apiErrorMessage } from '../../utils/apiError'
import styles from './ProjectEmails.module.css'

// Rótulos amigáveis para os eventos de e-mail registrados no histórico.
const EVENT_LABEL: Record<string, string> = {
  'client.welcome': 'Boas-vindas',
  'delivery.created': 'Nova entrega',
  'delivery.approved': 'Entrega aprovada',
  'delivery.rejected': 'Alteração solicitada',
  'project.statusUpdate': 'Atualização de status',
  'project.manual': 'E-mail manual',
}

// Normaliza o event (que pode carregar sufixo ":id" nas parcelas) para o rótulo.
function eventLabel(event: string): string {
  if (event.startsWith('installment.dueSoon')) return 'Parcela a vencer'
  if (event.startsWith('installment.overdue')) return 'Parcela vencida'
  return EVENT_LABEL[event] ?? event
}

// Seção de e-mails no detalhe do projeto (admin): formulário de envio manual ao
// cliente + histórico de e-mails enviados.
export function ProjectEmails({ projectId, hasClient }: { projectId: string; hasClient: boolean }) {
  const [logs, setLogs] = useState<IEmailLog[]>([])
  const [loading, setLoading] = useState(true)

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    emailService.listByProject(projectId)
      .then((res) => setLogs(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (subject.trim().length < 2 || message.trim().length < 5) return
    setSending(true)
    setFeedback(null)
    try {
      const res = await emailService.send(projectId, { subject: subject.trim(), message: message.trim() })
      setLogs(res.data.data)
      setSubject(''); setMessage('')
      setFeedback({ ok: true, text: 'E-mail enviado ao cliente.' })
    } catch (err) {
      setFeedback({ ok: false, text: apiErrorMessage(err, 'Erro ao enviar e-mail.') })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.wrap}>
      {/* Formulário de envio manual */}
      {hasClient ? (
        <form onSubmit={handleSend} className={styles.form}>
          <input
            className={styles.input}
            placeholder="Assunto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className={styles.textarea}
            placeholder="Mensagem ao cliente..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <div className={styles.formFooter}>
            {feedback && (
              <span className={feedback.ok ? styles.ok : styles.error}>
                {feedback.ok ? <IconCircleCheck size={14} /> : <IconAlertCircle size={14} />} {feedback.text}
              </span>
            )}
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={sending || subject.trim().length < 2 || message.trim().length < 5}
            >
              <IconMail size={15} /> {sending ? 'Enviando...' : 'Enviar ao cliente'}
            </button>
          </div>
        </form>
      ) : (
        <p className={styles.note}>Vincule um cliente ao projeto para enviar e-mails.</p>
      )}

      {/* Histórico */}
      <div className={styles.history}>
        <p className={styles.historyTitle}>Histórico</p>
        {loading ? (
          <p className={styles.note}>Carregando...</p>
        ) : logs.length === 0 ? (
          <p className={styles.note}>Nenhum e-mail enviado ainda.</p>
        ) : (
          <div className={styles.list}>
            {logs.map((log) => (
              <div key={log.id} className={styles.row}>
                <span className={`${styles.dot} ${log.status === 'SENT' ? styles.dotOk : styles.dotFail}`} />
                <div className={styles.rowMain}>
                  <p className={styles.rowSubject}>{log.subject}</p>
                  <p className={styles.rowMeta}>
                    {eventLabel(log.event)} · {log.to} · {formatDateTime(log.sentAt)}
                    {log.status === 'FAILED' && log.error && <span className={styles.error}> · {log.error}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
