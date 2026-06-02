import path from 'path';
import fs from 'fs';

// Diretório físico onde as imagens de entregas são gravadas. Fica fora de src/
// (na raiz do backend) e é servido como estático sob /api/uploads pelo app.
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Prefixo público das imagens. Sob /api para reaproveitar o proxy do Vite em dev
// e manter tudo same-origin (CSP imgSrc 'self' já cobre).
export const UPLOADS_PUBLIC_PREFIX = '/api/uploads';

// Garante a existência do diretório na inicialização (idempotente).
export function ensureUploadsDir(): void {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
