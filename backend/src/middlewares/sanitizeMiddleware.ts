import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

// Sanitização de entrada (defesa em profundidade contra XSS armazenado).
// Percorre recursivamente o req.body e remove qualquer HTML/script de strings.
// O conteúdo legítimo do app é texto puro — tags nunca são esperadas.
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // ALLOWED_TAGS vazio → remove todas as tags, mantendo só o texto.
    return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) out[key] = sanitizeValue(val);
    return out;
  }
  return value;
}

export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body) as typeof req.body;
  }
  next();
}
