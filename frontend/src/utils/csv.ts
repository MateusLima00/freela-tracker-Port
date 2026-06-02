// Geração e download de CSV no cliente (Fases 9 e 10).

// Escapa um campo para CSV: envolve em aspas e duplica aspas internas quando o
// valor contém vírgula, aspas ou quebra de linha.
function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Monta o conteúdo CSV a partir de cabeçalhos + linhas.
export function toCSV(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'))
  return lines.join('\r\n')
}

// Dispara o download de um arquivo CSV. Prefixa o BOM UTF-8 para o Excel
// reconhecer acentuação corretamente.
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
