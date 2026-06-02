// DTOs de entregas (Fase 7). As imagens não entram aqui — chegam como arquivos
// (multipart) e são processadas no controller antes de virar caminhos públicos.

export interface CreateDeliveryDTO {
  title: string;
  description?: string;
}

export interface RequestChangesDTO {
  feedback: string;
}
