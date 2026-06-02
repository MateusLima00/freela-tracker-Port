import { Router } from 'express';
import { taskController } from '../controllers/taskController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { createTaskSchema, updateTaskSchema } from '../validations/task.validation';
import { Role } from '../enums';

const router = Router();

router.use(authMiddleware, requireRole(Role.ADMIN));

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, DONE]
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *         projectId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateTaskRequest:
 *       type: object
 *       required: [title, projectId]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 2
 *           example: Implementar tela de login
 *         description:
 *           type: string
 *           example: Criar formulário com validações
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *           example: HIGH
 *         projectId:
 *           type: string
 *           example: clxxxxxxxxxxxxxxxxxxxxx
 *     UpdateTaskRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 2
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, DONE]
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 */

/**
 * @swagger
 * /tasks/project/{projectId}:
 *   get:
 *     summary: Lista tarefas de um projeto (ADMIN)
 *     tags: [Tasks]
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
 *         description: Lista de tarefas do projeto
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
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.get('/project/:projectId', taskController.getByProject);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Cria nova tarefa (ADMIN)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Tarefa criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Projeto não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 *       422:
 *         description: Dados de entrada inválidos
 */
router.post('/', validate(createTaskSchema), taskController.create);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Atualiza tarefa (ADMIN)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da tarefa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *     responses:
 *       200:
 *         description: Tarefa atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Tarefa não encontrada
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 *       422:
 *         description: Dados de entrada inválidos
 */
router.put('/:id', validate(updateTaskSchema), taskController.update);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Remove tarefa (ADMIN)
 *     tags: [Tasks]
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
 *         description: Tarefa deletada com sucesso
 *       400:
 *         description: Tarefa não encontrada
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado — requer ADMIN
 */
router.delete('/:id', taskController.delete);

export default router;
