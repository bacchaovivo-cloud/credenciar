import express from 'express';
import { registrarECredenciar, statusFila, reimprimirCheckin, testarImpressora } from '../controllers/impressaoController.js';
// 1. Adicionado a importação do apiKeyOrToken (ajuste o caminho se ele estiver em outro arquivo, como apiKeyMiddleware.js)
import { verifyToken } from '../middlewares/authMiddleware.js'; 
import { apiKeyOrToken } from '../middlewares/apiKeyMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();
console.log('✅ Impressao Routes Carregadas');

/**
 * @route POST /api/impressao/credenciar
 */
// 2. Aplicado o middleware apiKeyOrToken para garantir que só o Totem (X-API-Key) ou o Painel (JWT) acessem
router.post('/credenciar', apiKeyOrToken, asyncHandler(registrarECredenciar)); 

router.get('/status-fila/:eventoId', verifyToken, asyncHandler(statusFila));
router.post('/reimprimir/:convidadoId', verifyToken, asyncHandler(reimprimirCheckin));
router.post('/test-printer', verifyToken, asyncHandler(testarImpressora));

export default router;