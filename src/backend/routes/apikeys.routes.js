import { Router } from 'express';
import { verifyToken, adminOnly, checkRole } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { gerarApiKey, listarApiKeys, revogarApiKey } from '../controllers/apiKeyController.js';

const router = Router();

// Apenas admins e managers podem gerenciar API Keys de totens
router.post('/', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(gerarApiKey));
router.get('/:eventoId', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(listarApiKeys));
router.delete('/:id', verifyToken, adminOnly, asyncHandler(revogarApiKey));

export default router;
