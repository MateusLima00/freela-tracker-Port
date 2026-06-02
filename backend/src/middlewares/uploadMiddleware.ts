import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';

// Upload de imagens de entregas (Fase 7).
// Usamos memoryStorage: o arquivo nunca toca o disco em sua forma original — o
// buffer é validado por magic bytes e reprocessado pelo sharp antes de gravar
// (ver image.util). Isso evita salvar conteúdo malicioso com extensão forjada.
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB por imagem
const MAX_FILES = 10; // máximo de imagens por versão de entrega

const _upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  // Pré-filtro leve pelo mimetype declarado; a validação real (magic bytes)
  // acontece no image.util. Aqui só barramos o óbvio para não desperdiçar memória.
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Apenas arquivos de imagem são permitidos'));
  },
}).array('images', MAX_FILES);

/**
 * Wrapper que captura MulterError e erros do fileFilter e devolve
 * { success: false, message } em vez de deixar cair no errorMiddleware global
 * (que responderia 500 ou 400 sem body JSON legível para o frontend).
 * A assinatura Express (req, res, next) é idêntica — nenhuma rota precisa mudar.
 */
export function uploadDeliveryImages(req: Request, res: Response, next: NextFunction): void {
  _upload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const messages: Partial<Record<multer.MulterError['code'], string>> = {
        LIMIT_FILE_SIZE: `Cada imagem pode ter no máximo ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
        LIMIT_FILE_COUNT: `Envie no máximo ${MAX_FILES} imagens por vez.`,
        LIMIT_UNEXPECTED_FILE: 'Campo de arquivo inesperado. Use o campo "images".',
      };
      res.status(400).json({ success: false, message: messages[err.code] ?? err.message });
      return;
    }

    const message = err instanceof Error ? err.message : 'Erro no upload das imagens.';
    res.status(400).json({ success: false, message });
  });
}
