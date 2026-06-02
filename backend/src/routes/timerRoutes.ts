import { Router } from 'express';
import { timerController } from '../controllers/timerController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { startTimerSchema, stopTimerSchema } from '../validations/timer.validation';
import { Role } from '../enums';

const router = Router();

router.use(authMiddleware, requireRole(Role.ADMIN));

/**
 * @swagger
 * components:
 *   schemas:
 *     TimerSession:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         projectId:
 *           type: string
 *         userId:
 *           type: string
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         duration:
 *           type: integer
 *           description: Duração em segundos
 *           nullable: true
 *         isActive:
 *           type: boolean
 *         note:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     StartTimerRequest:
 *       type: object
 *       required: [projectId]
 *       properties:
 *         projectId:
 *           type: string
 *           example: clxxxxxxxxxxxxxxxxxxxxx
 *         note:
 *           type: string
 *           example: Trabalhando no layout
 */

/**
 * @swagger
 * /timer/start:
 *   post:
 *     summary: Inicia sessão de timer (ADMIN)
 *     tags: [Timer]
 *     security:
 *       - bearerAuth: []
 *     description: Só é possível ter um timer ativo por vez. Pare o timer atual antes de iniciar outro.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartTimerRequest'
 *     responses:
 *       201:
 *         description: Timer iniciado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TimerSession'
 *       400:
 *         description: Já existe um timer ativo ou projeto não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 *       422:
 *         description: Dados de entrada inválidos
 */
router.post('/start', validate(startTimerSchema), timerController.start);

/**
 * @swagger
 * /timer/stop/{sessionId}:
 *   patch:
 *     summary: Para sessão de timer (ADMIN)
 *     tags: [Timer]
 *     security:
 *       - bearerAuth: []
 *     description: Registra o endTime, calcula a duração e acumula o tempo no projeto.
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sessão de timer
 *     responses:
 *       200:
 *         description: Timer parado — retorna sessão com duração calculada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TimerSession'
 *       400:
 *         description: Sessão não encontrada, timer já parado ou sem permissão
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.patch('/pause/:sessionId', timerController.pause);
router.patch('/resume/:sessionId', timerController.resume);
router.patch('/stop/:sessionId', validate(stopTimerSchema), timerController.stop);

/**
 * @swagger
 * /timer/active:
 *   get:
 *     summary: Retorna o timer ativo do usuário (ADMIN)
 *     tags: [Timer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessão ativa ou null se nenhum timer rodando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/TimerSession'
 *                     - type: 'null'
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.get('/active', timerController.getActive);

/**
 * @swagger
 * /timer/project/{projectId}:
 *   get:
 *     summary: Lista sessões de timer de um projeto (ADMIN)
 *     tags: [Timer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Histórico de sessões do projeto (mais recentes primeiro)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TimerSession'
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.get('/project/:projectId', timerController.getByProject);

export default router;
