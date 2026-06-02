import { Router } from 'express';
import { clientController } from '../controllers/clientController';
import { deliveryController } from '../controllers/deliveryController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireClient } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { requestChangesSchema } from '../validations/delivery.validation';

const router = Router();

router.use(authMiddleware, requireClient);

/**
 * @swagger
 * /client/projects:
 *   get:
 *     summary: Lista os projetos do cliente autenticado (CLIENT)
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Projetos do cliente com tarefas e últimos 5 updates
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
 *         description: Acesso negado — requer CLIENT
 */
router.get('/projects', clientController.getMyProjects);

/**
 * @swagger
 * /client/projects/{id}:
 *   get:
 *     summary: Busca projeto específico do cliente (CLIENT)
 *     tags: [Client]
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
 *         description: Acesso negado — requer CLIENT ou projeto de outro cliente
 *       404:
 *         description: Projeto não encontrado
 */
router.get('/projects/:id', clientController.getMyProject);

/**
 * @swagger
 * /client/projects/{id}/updates:
 *   get:
 *     summary: Lista updates de progresso do projeto (CLIENT)
 *     tags: [Client]
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
 *         description: Timeline de updates publicados pelo admin
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
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer CLIENT ou projeto de outro cliente
 *       404:
 *         description: Projeto não encontrado
 */
router.get('/projects/:id/updates', clientController.getProjectUpdates);
router.get('/projects/:id/financial', clientController.getFinancial);

// ── Entregas (Fase 7) ──
// Listagem gated por viewDeliveries; ações gated por approveDeliveries.
// A posse do projeto/entrega é validada no serviço a cada requisição.
router.get('/projects/:id/deliveries', deliveryController.listForClient);
router.patch('/deliveries/:id/approve', deliveryController.approve);
router.patch('/deliveries/:id/request-changes', validate(requestChangesSchema), deliveryController.requestChanges);

export default router;
