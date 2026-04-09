import express from 'express';
import { registrarECredenciar, statusFila, reimprimirCheckin, testarImpressora } from '../controllers/impressaoController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
console.log('✅ Impressao Routes Carregadas');

/**
 * @route POST /api/impressao/credenciar
 */
router.post('/credenciar', asyncHandler(registrarECredenciar)); // Aberto para o Totem
router.get('/status-fila/:eventoId', verifyToken, asyncHandler(statusFila));
router.post('/reimprimir/:convidadoId', verifyToken, asyncHandler(reimprimirCheckin));
router.post('/test-printer', verifyToken, asyncHandler(testarImpressora));

export default router;
