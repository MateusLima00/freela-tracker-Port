import rateLimit from 'express-rate-limit';

// Limite global generoso para o tráfego normal de uma SPA autenticada (uma página
// dispara várias chamadas + imagens). Rotas sensíveis têm limites estritos
// próprios (authRateLimit, uploadLimiter, emailLimiter).
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Muitas requisições. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Não conta imagens estáticas de entregas nem o health check — não são abuso e
  // inflam o contador (uma página de projeto pode carregar dezenas de imagens).
  skip: (req) => req.path.startsWith('/api/uploads') || req.path === '/api/health',
});

// Limitador de login/registro: janela curta (1 min) para recuperar rápido — o
// brute-force é contido principalmente pelo bloqueio progressivo (LoginAttempt,
// 5 falhas/15min). NÃO deve ser usado no /refresh (chamado automaticamente pelo front).
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Aguarde um instante e tente novamente.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload de imagens de entregas (Fase 7) — limita a 30 uploads por hora por IP,
// já que cada requisição pode reprocessar várias imagens (custo de CPU/IO).
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Muitos uploads. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Envio manual de e-mail por projeto (Fase 8) — 10 por hora por IP.
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Muitos e-mails enviados. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});
