import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { createProjectSchema, updateProjectSchema } from '../validations/project.validation';
import { setInstallmentsSchema } from '../validations/installment.validation';
import { createDeliverySchema } from '../validations/delivery.validation';
import { installmentController } from '../controllers/installmentController';
import { deliveryController } from '../controllers/deliveryController';
import { reportController } from '../controllers/reportController';
import { emailController } from '../controllers/emailController';
import { uploadDeliveryImages } from '../middlewares/uploadMiddleware';
import { uploadLimiter, emailLimiter } from '../middlewares/rateLimitMiddleware';
import { sendEmailSchema } from '../validations/email.validation';
import { Role } from '../enums';

const router = Router();

router.use(authMiddleware, requireRole(Role.ADMIN));

// ── Financeiro do projeto ──
router.get('/:id/financial', installmentController.getFinancial);
router.post('/:id/installments', validate(setInstallmentsSchema), installmentController.setInstallments);

// ── Entregas do projeto (Fase 7) ──
// multer (uploadDeliveryImages) roda antes do validate para popular req.body
// com os campos de texto do multipart.
router.get('/:id/deliveries', deliveryController.listByProject);
router.post(
  '/:id/deliveries',
  uploadLimiter,
  uploadDeliveryImages,
  validate(createDeliverySchema),
  deliveryController.create,
);

// ── Relatório de horas do projeto (Fase 9) ──
router.get('/:id/report', reportController.getProjectReport);

// ── E-mail do projeto (Fase 8) ──
router.get('/:id/emails', emailController.listByProject);
router.post('/:id/send-email', emailLimiter, validate(sendEmailSchema), emailController.send);

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         progress:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         status:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, PAUSED]
 *         deadline:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         totalTime:
 *           type: integer
 *           description: Tempo total em segundos
 *         clientId:
 *           type: string
 *         client:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateProjectRequest:
 *       type: object
 *       required: [title, clientId]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 2
 *           example: Site Institucional
 *         description:
 *           type: string
 *           example: Desenvolvimento do site completo
 *         clientId:
 *           type: string
 *           example: clxxxxxxxxxxxxxxxxxxxxx
 *         deadline:
 *           type: string
 *           format: date-time
 *           example: 2026-08-01T00:00:00.000Z
 *     UpdateProjectRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 2
 *         description:
 *           type: string
 *         progress:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         status:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, PAUSED]
 *         deadline:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Lista todos os projetos (ADMIN)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de projetos com tarefas e cliente
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
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.get('/', projectController.getAll);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Busca projeto por ID (ADMIN)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Projeto com tarefas, updates e sessões de timer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 *       404:
 *         description: Projeto não encontrado
 */
router.get('/:id', projectController.getById);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Cria novo projeto (ADMIN)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Projeto criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Cliente não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 *       422:
 *         description: Dados de entrada inválidos
 */
router.post('/', validate(createProjectSchema), projectController.create);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Atualiza projeto (ADMIN)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProjectRequest'
 *     responses:
 *       200:
 *         description: Projeto atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Projeto não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 *       422:
 *         description: Dados de entrada inválidos
 */
router.put('/:id', validate(updateProjectSchema), projectController.update);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Remove projeto (ADMIN)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projeto deletado com sucesso
 *       400:
 *         description: Projeto não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.delete('/:id', projectController.delete);

export default router;
