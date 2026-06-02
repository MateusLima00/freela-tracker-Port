import { Router } from 'express';
import { installmentController } from '../controllers/installmentController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { updateInstallmentSchema } from '../validations/installment.validation';
import { Role } from '../enums';

// Rotas de parcela por ID (ADMIN). Montadas em /api/installments.
const router = Router();
router.use(authMiddleware, requireRole(Role.ADMIN));

router.put('/:id', validate(updateInstallmentSchema), installmentController.update);
router.patch('/:id/mark-paid', installmentController.markPaid);
router.delete('/:id', installmentController.delete);

export default router;
