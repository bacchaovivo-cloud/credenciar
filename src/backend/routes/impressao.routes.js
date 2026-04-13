import express from 'express';
import { registrarECredenciar, statusFila, reimprimirCheckin, testarImpressora } from '../controllers/impressaoController.js';
import { verifyToken, checkRole } from '../middlewares/authMiddleware.js';
import { apiKeyOrToken } from '../middlewares/apiKeyMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
console.log('✅ Impressao Routes Carregadas');

/**
 * @route POST /api/impressao/credenciar
 * Aceita JWT (usuários) OU X-API-Key (totens/kiosks).
 * ATENÇÃO: apiKeyOrToken(verifyToken) — com parênteses e o argumento.
 * É uma factory function, não um middleware direto. Sem o (verifyToken) o fallback JWT não funciona.
 */
router.post('/credenciar', apiKeyOrToken(verifyToken), asyncHandler(registrarECredenciar));
router.get('/status-fila/:eventoId', verifyToken, asyncHandler(statusFila));
router.post('/reimprimir/:convidadoId', verifyToken, asyncHandler(reimprimirCheckin));
router.post('/test-printer', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(testarImpressora));

export default router;