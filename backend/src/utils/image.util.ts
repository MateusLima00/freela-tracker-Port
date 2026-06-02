import sharp from 'sharp';
import { imageStorage } from '../services/storage.service';

// Validação de imagem por *magic bytes* (assinatura no início do arquivo), nunca
// pela extensão ou pelo Content-Type informado — ambos são facilmente forjáveis.
// Aceitamos JPEG, PNG e WebP, que cobrem o caso de uso de entregas visuais.
function detectImageType(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

// Processa um buffer de imagem e grava no diretório de uploads:
//  - valida a assinatura (rejeita qualquer coisa que não seja imagem real)
//  - reprocessa via sharp, o que descarta metadados/EXIF (não chamamos withMetadata)
//  - auto-orienta pela rotação do EXIF antes de removê-lo
//  - limita a dimensão máxima para conter o tamanho
//  - padroniza a saída em WebP com nome UUID (nunca o nome original do arquivo)
// Retorna o caminho público (servível pelo front).
export async function processAndStoreImage(buffer: Buffer): Promise<string> {
  if (!detectImageType(buffer)) {
    throw new Error('Arquivo não é uma imagem válida (JPEG, PNG ou WebP)');
  }

  // Reprocessa para um buffer WebP limpo (descarta EXIF; não chamamos withMetadata).
  const processed = await sharp(buffer)
    .rotate() // aplica a orientação do EXIF antes de descartá-lo
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  // Delega a gravação ao storage configurado (local ou Cloudinary).
  return imageStorage.save(processed);
}

// Processa várias imagens em paralelo, preservando a ordem de entrada.
export function processAndStoreImages(buffers: Buffer[]): Promise<string[]> {
  return Promise.all(buffers.map((b) => processAndStoreImage(b)));
}

// Remove imagens a partir de suas URLs públicas. Usado ao deletar uma entrega —
// falhas são ignoradas (arquivo já ausente não é erro relevante).
export async function deleteStoredImages(publicPaths: string[]): Promise<void> {
  await Promise.all(publicPaths.map((p) => imageStorage.remove(p)));
}
