import { Router } from 'express';
import { verifyToken, adminOnly, checkRole } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { criarWebhook, listarWebhooks, removerWebhook, historicoEntregas } from '../controllers/webhookController.js';

const router = Router();

// Apenas admins e managers gerenciam webhooks
router.post('/', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(criarWebhook));
router.get('/:eventoId', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(listarWebhooks));
router.delete('/:id', verifyToken, adminOnly, asyncHandler(removerWebhook));
router.get('/entregas/:id', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(historicoEntregas));

export default router;
