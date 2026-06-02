export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Dias inteiros até a data (negativo = atrasado). Compara só a parte de data.
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const today = new Date()
  const t = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate())
  const n = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((t - n) / 86_400_000)
}

// Horas com 1 casa a partir de segundos (ex: 9000s → "2,5h")
export function formatHours(totalSeconds: number): string {
  const hours = totalSeconds / 3600
  return `${hours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`
}

// Valor monetário (ex: 1500 → "R$ 1.500,00")
export function formatMoney(value: number, currency = 'BRL'): string {
  try {
    return value.toLocaleString('pt-BR', { style: 'currency', currency })
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}
