import express from 'express';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import { helmetMiddleware, corsMiddleware } from './middlewares/securityMiddleware';
import { loggerMiddleware } from './middlewares/loggerMiddleware';
import { rateLimitMiddleware } from './middlewares/rateLimitMiddleware';
import { sanitizeMiddleware } from './middlewares/sanitizeMiddleware';
import { errorMiddleware } from './middlewares/errorMiddleware';
import { swaggerSpec } from './config/swagger';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import timerRoutes from './routes/timerRoutes';
import clientRoutes from './routes/clientRoutes';
import statsRoutes from './routes/statsRoutes';
import updateRoutes from './routes/updateRoutes';
import adminClientRoutes from './routes/adminClientRoutes';
import installmentRoutes from './routes/installmentRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import { UPLOADS_DIR, UPLOADS_PUBLIC_PREFIX, ensureUploadsDir } from './config/uploads';

// Garante o diretório de uploads na inicialização (imagens de entregas).
ensureUploadsDir();

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(cookieParser());
app.use(loggerMiddleware);
app.use(rateLimitMiddleware);
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(hpp()); // protege contra HTTP Parameter Pollution
app.use(sanitizeMiddleware); // remove HTML/script de strings do body (anti-XSS)

// Imagens de entregas servidas como estático sob /api/uploads (same-origin via
// proxy do Vite em dev; CSP imgSrc 'self' já cobre). cacheável por 1 dia.
app.use(UPLOADS_PUBLIC_PREFIX, express.static(UPLOADS_DIR, { maxAge: '1d', index: false }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/admin/clients', adminClientRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/deliveries', deliveryRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use(errorMiddleware);

export default app;
