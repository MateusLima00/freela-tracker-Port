import { useEffect, useState } from 'react'
import { IconPlus, IconTrash, IconCheck, IconAlertTriangle } from '@tabler/icons-react'
import { projectService } from '../../services/project.service'
import type { InstallmentInput } from '../../services/project.service'
import type { IFinancialSummary, BillingType, InstallmentStatus } from '../../interfaces'
import { ProgressBar } from '../ProgressBar/ProgressBar'
import { formatMoney, formatHours } from '../../utils/format'
import { apiErrorMessage } from '../../utils/apiError'
import styles from './FinancialAdmin.module.css'

const BILLING_OPTIONS: Array<{ value: BillingType; label: string }> = [
  { value: 'FIXED', label: 'Valor fixo' },
  { value: 'HOURLY', label: 'Por hora' },
  { value: 'INSTALLMENTS', label: 'Parcelado' },
]

const STATUS_OPTIONS: Array<{ value: InstallmentStatus; label: string }> = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'SENT', label: 'Enviada' },
  { value: 'PAID', label: 'Paga' },
  { value: 'OVERDUE', label: 'Atrasada' },
]

// Linha editável de parcela no rascunho local
interface DraftRow {
  description: string
  value: string
  dueDate: string // yyyy-mm-dd
  status: InstallmentStatus
}

function toDraft(inst: IFinancialSummary['installments'][number]): DraftRow {
  return {
    description: inst.description ?? '',
    value: String(inst.value),
    dueDate: inst.dueDate ? inst.dueDate.split('T')[0] : '',
    status: inst.status,
  }
}

export function FinancialAdmin({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState<IFinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const [billingType, setBillingType] = useState<BillingType>('FIXED')
  const [totalValue, setTotalValue] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [rows, setRows] = useState<DraftRow[]>([])
  const [savingBilling, setSavingBilling] = useState(false)
  const [savingParcels, setSavingParcels] = useState(false)

  /* erros inline por bloco (cobrança / parcelas) */
  const [billingError, setBillingError] = useState('')
  const [parcelsError, setParcelsError] = useState('')

  function syncFromSummary(s: IFinancialSummary) {
    setSummary(s)
    setBillingType(s.billingType)
    setTotalValue(s.billingType === 'HOURLY' ? '' : s.total ? String(s.total) : '')
    setHourlyRate(s.hourlyRate ? String(s.hourlyRate) : '')
    setRows(s.installments.map(toDraft))
  }

  function load() {
    projectService.getFinancial(projectId)
      .then((res) => syncFromSummary(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveBilling() {
    setSavingBilling(true)
    setBillingError('')
    try {
      await projectService.update(projectId, {
        billingType,
        totalValue: billingType === 'HOURLY' ? null : Number(totalValue) || 0,
        hourlyRate: billingType === 'HOURLY' ? Number(hourlyRate) || 0 : null,
      })
      const res = await projectService.getFinancial(projectId)
      syncFromSummary(res.data.data)
    } catch (err) {
      setBillingError(apiErrorMessage(err, 'Erro ao salvar cobrança.'))
    } finally {
      setSavingBilling(false)
    }
  }

  function addRow() {
    setRows((r) => [...r, { description: '', value: '', dueDate: '', status: 'PENDING' }])
  }

  function updateRow(i: number, patch: Partial<DraftRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i))
  }

  async function saveParcels() {
    const installments: InstallmentInput[] = rows.map((r, i) => ({
      number: i + 1,
      description: r.description.trim() || null,
      value: Number(r.value) || 0,
      dueDate: r.dueDate ? new Date(r.dueDate + 'T12:00:00').toISOString() : null,
      status: r.status,
    }))
    setSavingParcels(true)
    setParcelsError('')
    try {
      const res = await projectService.setInstallments(projectId, installments)
      syncFromSummary(res.data.data)
    } catch (err) {
      setParcelsError(apiErrorMessage(err, 'Erro ao salvar parcelas.'))
    } finally {
      setSavingParcels(false)
    }
  }

  if (loading || !summary) return <p className={styles.loading}>Carregando financeiro...</p>

  const draftSum = rows.reduce((acc, r) => acc + (Number(r.value) || 0), 0)
  const payPct = summary.total > 0 ? Math.round((summary.totalPaid / summary.total) * 100) : 0
  const showInstallments = billingType === 'INSTALLMENTS'
  const sumMatches = Math.abs(draftSum - (Number(totalValue) || 0)) < 0.01

  return (
    <div className={styles.wrap}>
      {/* Tipo de cobrança */}
      <div className={styles.billingRow}>
        <div className={styles.segment}>
          {BILLING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.segmentBtn} ${billingType === opt.value ? styles.segmentActive : ''}`}
              onClick={() => setBillingType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {billingType === 'HOURLY' ? (
          <div className={styles.field}>
            <label className={styles.label}>Valor por hora ({summary.currency})</label>
            <input
              className={styles.input}
              type="number" min="0" step="0.01"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="Ex: 120"
            />
          </div>
        ) : (
          <div className={styles.field}>
            <label className={styles.label}>Valor total ({summary.currency})</label>
            <input
              className={styles.input}
              type="number" min="0" step="0.01"
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
              placeholder="Ex: 4000"
            />
          </div>
        )}

        <button className={styles.btnPrimary} onClick={saveBilling} disabled={savingBilling}>
          {savingBilling ? 'Salvando...' : 'Salvar cobrança'}
        </button>
        {billingError && <p className={styles.errorMsg}>{billingError}</p>}
      </div>

      {/* Resumo */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total</span>
          <span className={styles.summaryValue}>{formatMoney(summary.total, summary.currency)}</span>
          {billingType === 'HOURLY' && summary.hours !== null && (
            <span className={styles.summarySub}>
              {formatHours(summary.hours * 3600)} × {formatMoney(summary.hourlyRate ?? 0, summary.currency)}
            </span>
          )}
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Recebido</span>
          <span className={styles.summaryValue}>{formatMoney(summary.totalPaid, summary.currency)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Saldo</span>
          <span className={styles.summaryValue}>{formatMoney(summary.balance, summary.currency)}</span>
        </div>
        <div className={styles.summaryProgress}>
          <ProgressBar percent={payPct} height={6} />
          <span className={styles.summarySub}>{payPct}% recebido</span>
        </div>
      </div>

      {/* Parcelas */}
      {showInstallments && (
        <div className={styles.installments}>
          <div className={styles.instHeader}>
            <span className={styles.instTitle}>Parcelas</span>
            <button className={styles.btnAdd} onClick={addRow}><IconPlus size={14} /> Adicionar</button>
          </div>

          {rows.length === 0 ? (
            <p className={styles.empty}>Nenhuma parcela. Adicione para detalhar o parcelamento.</p>
          ) : (
            <div className={styles.table}>
              {rows.map((row, i) => (
                <div key={i} className={styles.row}>
                  <span className={styles.rowNum}>{i + 1}</span>
                  <input
                    className={styles.input}
                    placeholder="Descrição (ex: Entrada)"
                    value={row.description}
                    onChange={(e) => updateRow(i, { description: e.target.value })}
                  />
                  <input
                    className={styles.inputSm}
                    type="number" min="0" step="0.01"
                    placeholder="Valor"
                    value={row.value}
                    onChange={(e) => updateRow(i, { value: e.target.value })}
                  />
                  <input
                    className={styles.inputSm}
                    type="date"
                    value={row.dueDate}
                    onChange={(e) => updateRow(i, { dueDate: e.target.value })}
                  />
                  <select
                    className={styles.select}
                    value={row.status}
                    onChange={(e) => updateRow(i, { status: e.target.value as InstallmentStatus })}
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {row.status !== 'PAID' && (
                    <button className={styles.btnPaid} title="Marcar recebida" onClick={() => updateRow(i, { status: 'PAID' })}>
                      <IconCheck size={14} />
                    </button>
                  )}
                  <button className={styles.btnDel} title="Remover" onClick={() => removeRow(i)}>
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.instFooter}>
            <span className={`${styles.sumCheck} ${sumMatches ? styles.sumOk : styles.sumWarn}`}>
              {sumMatches
                ? <><IconCheck size={14} /> Soma {formatMoney(draftSum, summary.currency)} bate com o total</>
                : <><IconAlertTriangle size={14} /> Soma {formatMoney(draftSum, summary.currency)} ≠ total {formatMoney(Number(totalValue) || 0, summary.currency)}</>}
            </span>
            <button className={styles.btnPrimary} onClick={saveParcels} disabled={savingParcels}>
              {savingParcels ? 'Salvando...' : 'Salvar parcelas'}
            </button>
          </div>
          {parcelsError && <p className={styles.errorMsg}>{parcelsError}</p>}
        </div>
      )}
    </div>
  )
}
