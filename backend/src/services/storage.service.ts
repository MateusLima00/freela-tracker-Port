import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { UPLOADS_DIR, UPLOADS_PUBLIC_PREFIX, ensureUploadsDir } from '../config/uploads';

// Abstração de armazenamento de imagens. Mantém o domínio (image.util) agnóstico
// de onde os arquivos vivem: local em dev / Cloudinary quando configurado.
export interface ImageStorage {
  // Grava um buffer WebP já processado e devolve a URL pública.
  save(buffer: Buffer): Promise<string>;
  // Remove a imagem a partir da URL pública (best-effort).
  remove(publicUrl: string): Promise<void>;
}

// ── Local ──────────────────────────────────────────────────────────────────
const localStorage: ImageStorage = {
  async save(buffer) {
    ensureUploadsDir();
    const filename = `${randomUUID()}.webp`;
    await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);
    return `${UPLOADS_PUBLIC_PREFIX}/${filename}`;
  },
  async remove(publicUrl) {
    const filename = path.basename(publicUrl);
    try {
      await fs.unlink(path.join(UPLOADS_DIR, filename));
    } catch {
      /* arquivo inexistente — ignora */
    }
  },
};

// ── Cloudinary ───────────────────────────────────────────────────────────────
const CLOUD_FOLDER = 'freelatracker/deliveries';

const cloudinaryStorage: ImageStorage = {
  save(buffer) {
    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: CLOUD_FOLDER, resource_type: 'image', format: 'webp' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Falha no upload Cloudinary'));
          resolve(result.secure_url);
        },
      );
      stream.end(buffer);
    });
  },
  async remove(publicUrl) {
    // Deriva o public_id a partir da URL: .../upload/v123/<folder>/<name>.webp
    const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i.exec(publicUrl);
    if (!match) return;
    try {
      await cloudinary.uploader.destroy(match[1]);
    } catch (err) {
      logger.error(`[storage] falha ao remover do Cloudinary: ${err}`);
    }
  },
};

// Seleciona o backend de storage uma única vez na carga do módulo.
const useCloudinary = Boolean(env.CLOUDINARY_URL);
if (useCloudinary) {
  // O SDK lê CLOUDINARY_URL do ambiente automaticamente; chamamos config() p/ garantir.
  cloudinary.config({ secure: true });
  logger.info('[storage] usando Cloudinary para imagens de entregas');
}

export const imageStorage: ImageStorage = useCloudinary ? cloudinaryStorage : localStorage;
