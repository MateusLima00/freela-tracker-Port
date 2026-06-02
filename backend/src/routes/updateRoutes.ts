import { Router } from 'express';
import { updateController } from '../controllers/updateController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { createUpdateSchema, editUpdateSchema } from '../validations/update.validation';
import { Role } from '../enums';

const router = Router();

router.use(authMiddleware, requireRole(Role.ADMIN));

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectUpdate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         projectId:
 *           type: string
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateUpdateRequest:
 *       type: object
 *       required: [projectId, title, content]
 *       properties:
 *         projectId:
 *           type: string
 *           example: clxxxxxxxxxxxxxxxxxxxxx
 *         title:
 *           type: string
 *           minLength: 2
 *           example: Entrega parcial — fase 1
 *         content:
 *           type: string
 *           minLength: 5
 *           example: Todas as telas da fase 1 foram finalizadas e enviadas para revisão.
 *     EditUpdateRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 2
 *         content:
 *           type: string
 *           minLength: 5
 */

/**
 * @swagger
 * /updates/project/{projectId}:
 *   get:
 *     summary: Lista updates de um projeto (ADMIN)
 *     tags: [Updates]
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
 *         description: Lista de updates do projeto (mais recentes primeiro)
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
 *                     $ref: '#/components/schemas/ProjectUpdate'
 *       400:
 *         description: Projeto não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.get('/project/:projectId', updateController.getByProject);

/**
 * @swagger
 * /updates:
 *   post:
 *     summary: Publica update de progresso (ADMIN)
 *     tags: [Updates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUpdateRequest'
 *     responses:
 *       201:
 *         description: Update publicado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProjectUpdate'
 *       400:
 *         description: Projeto não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 *       422:
 *         description: Dados de entrada inválidos
 */
router.post('/', validate(createUpdateSchema), updateController.create);

/**
 * @swagger
 * /updates/{id}:
 *   put:
 *     summary: Edita update de progresso (ADMIN)
 *     tags: [Updates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EditUpdateRequest'
 *     responses:
 *       200:
 *         description: Update editado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProjectUpdate'
 *       400:
 *         description: Atualização não encontrada
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 *       422:
 *         description: Dados de entrada inválidos
 */
router.put('/:id', validate(editUpdateSchema), updateController.update);

/**
 * @swagger
 * /updates/{id}:
 *   delete:
 *     summary: Remove update de progresso (ADMIN)
 *     tags: [Updates]
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
 *         description: Atualização deletada com sucesso
 *       400:
 *         description: Atualização não encontrada
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.delete('/:id', updateController.delete);

export default router;
