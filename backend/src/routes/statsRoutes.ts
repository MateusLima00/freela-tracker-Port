import { Router } from 'express';
import { statsController } from '../controllers/statsController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { Role } from '../enums';

const router = Router();

router.use(authMiddleware, requireRole(Role.ADMIN));

/**
 * @swagger
 * /stats/dashboard:
 *   get:
 *     summary: Dashboard analítico (ADMIN)
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Totais, projetos recentes, distribuição por status e tempo total logado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totals:
 *                       type: object
 *                       properties:
 *                         projects:
 *                           type: integer
 *                           example: 12
 *                         clients:
 *                           type: integer
 *                           example: 5
 *                         tasks:
 *                           type: integer
 *                           example: 48
 *                         timeLogged:
 *                           type: string
 *                           description: Tempo total formatado HH:MM:SS
 *                           example: 37:15:42
 *                     recentProjects:
 *                       type: array
 *                       description: Últimos 5 projetos atualizados
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [PENDING, IN_PROGRESS, COMPLETED, PAUSED]
 *                           progress:
 *                             type: integer
 *                           totalTime:
 *                             type: integer
 *                           totalTimeFormatted:
 *                             type: string
 *                             example: 04:30:00
 *                           deadline:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                     tasksByStatus:
 *                       type: array
 *                       description: Contagem de tarefas agrupadas por status
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             enum: [TODO, IN_PROGRESS, DONE]
 *                           _count:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: integer
 *                     projectsByStatus:
 *                       type: array
 *                       description: Contagem de projetos agrupados por status
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             enum: [PENDING, IN_PROGRESS, COMPLETED, PAUSED]
 *                           _count:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: integer
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.get('/dashboard', statsController.getDashboard);

export default router;
