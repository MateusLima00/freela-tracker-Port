import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireClient } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { authRateLimit } from '../middlewares/rateLimitMiddleware';
import { loginSchema, registerSchema, changePasswordSchema } from '../validations/auth.validation';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Autenticação (admin e cliente), refresh token e sessões
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra um admin
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       201: { description: Admin registrado; access token no body, refresh em cookie }
 */
router.post('/register', authRateLimit, validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login de admin
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200: { description: Login OK; accessToken no body, refresh em cookie httpOnly }
 *       401: { description: Credenciais inválidas }
 */
router.post('/login', authRateLimit, validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/client/login:
 *   post:
 *     summary: Login de cliente (portal)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200: { description: Login OK; pode exigir troca de senha no 1º acesso }
 *       401: { description: Credenciais inválidas }
 */
router.post('/client/login', authRateLimit, validate(loginSchema), authController.clientLogin);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Emite novo access token a partir do refresh cookie (com rotação)
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200: { description: Novo access token }
 *       401: { description: Sessão inválida }
 */
// Sem authRateLimit: o refresh é disparado automaticamente pelo front e protegido
// pelo cookie httpOnly; fica sob o limitador global (generoso).
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Revoga a sessão atual e limpa o cookie
 *     tags: [Auth]
 *     security: []
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Revoga todas as sessões do usuário autenticado
 *     tags: [Auth]
 */
router.post('/logout-all', authMiddleware, authController.logoutAll);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retorna o principal autenticado (admin ou cliente)
 *     tags: [Auth]
 */
router.get('/me', authMiddleware, authController.me);

/**
 * @swagger
 * /auth/client/change-password:
 *   post:
 *     summary: Troca a senha do cliente (obrigatória no 1º acesso)
 *     tags: [Auth]
 */
router.post(
  '/client/change-password',
  authMiddleware,
  requireClient,
  validate(changePasswordSchema),
  authController.changeClientPassword,
);

export default router;
