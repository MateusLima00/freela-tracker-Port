import { Router } from 'express';
import { adminClientController } from '../controllers/adminClientController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { createClientSchema, updateClientSchema } from '../validations/adminClient.validation';
import { Role } from '../enums';

const router = Router();

router.use(authMiddleware, requireRole(Role.ADMIN));

router.get('/',                                   adminClientController.list);
router.get('/projects/unlinked',                  adminClientController.listUnlinkedProjects);
router.get('/:id',                                adminClientController.getById);
router.post('/',        validate(createClientSchema), adminClientController.create);
router.put('/:id',      validate(updateClientSchema), adminClientController.update);
router.delete('/:id',                             adminClientController.delete);
router.post('/:id/projects/:projectId',           adminClientController.linkProject);
router.delete('/:id/projects/:projectId',         adminClientController.unlinkProject);

export default router;
