import { Router } from 'express';
import { deliveryController } from '../controllers/deliveryController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { uploadDeliveryImages } from '../middlewares/uploadMiddleware';
import { uploadLimiter } from '../middlewares/rateLimitMiddleware';
import { Role } from '../enums';

// Ações de entrega por ID (ADMIN). Montadas em /api/deliveries.
// As rotas de listar/criar por projeto ficam em projectRoutes (padrão dos
// installments); as ações do cliente ficam em clientRoutes.
const router = Router();
router.use(authMiddleware, requireRole(Role.ADMIN));

/**
 * @swagger
 * /deliveries/{id}/versions:
 *   post:
 *     summary: Adiciona nova versão a uma entrega com upload de imagens (ADMIN)
 *     tags: [Deliveries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items: { type: string, format: binary }
 *     responses:
 *       201: { description: Versão adicionada }
 */
router.post('/:id/versions', uploadLimiter, uploadDeliveryImages, deliveryController.addVersion);

/**
 * @swagger
 * /deliveries/{id}/unlock:
 *   patch:
 *     summary: Desbloqueia uma entrega aprovada (ADMIN)
 *     tags: [Deliveries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Entrega desbloqueada }
 */
router.patch('/:id/unlock', deliveryController.unlock);

/**
 * @swagger
 * /deliveries/{id}:
 *   delete:
 *     summary: Remove uma entrega e suas imagens (ADMIN)
 *     tags: [Deliveries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Entrega removida }
 */
router.delete('/:id', deliveryController.delete);

export default router;
