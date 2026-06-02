// Extrai a mensagem de erro mais útil de uma falha de requisição.
// O backend devolve { success: false, message } — preferimos essa mensagem;
// caímos para a mensagem do Error ou para um texto padrão informado.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data
    if (data?.message) return data.message
  }
  return err instanceof Error ? err.message : fallback
}
