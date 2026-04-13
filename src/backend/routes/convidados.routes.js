import { Router } from 'express';
import { StationService } from '../services/stationService.js';
import { 
  getConvidados, createConvidado, createConvidadosMassa, updateConvidado, 
  deleteConvidado, check, checkinFace, updateFaceDescriptor, checkinMassa, 
  desfazerCheckin, exportarCSV, importarEmMassa, exportarXLSX, getSorteio, resetCheckins 
} from '../controllers/convidadosController.js';
import { verifyToken, adminOnly, checkRole } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkinLimiter } from '../middlewares/rateLimiter.js';
import { apiKeyOrToken } from '../middlewares/apiKeyMiddleware.js';

const router = Router();

// 🩺 ZENITH HEARTBEAT
// 🔒 CORREÇÃO: Middleware apiKeyOrToken(verifyToken) aplicado para evitar falsificação de status
router.post('/station/ping', apiKeyOrToken(verifyToken), checkRole(['ADMIN', 'TOTEM']), (req, res) => {
    const { stationId, type, status } = req.body;
    StationService.reportStatus(stationId, type || 'TOTEM', status || 'ACTIVE');
    res.sendStatus(200);
});

// ⚠️ Rotas específicas ANTES dos parâmetros dinâmicos (:id, :eventoId)
router.post('/checkin/massa', verifyToken, asyncHandler(checkinMassa));
// Fix: checkin via face requer autenticação — evita injeção biométrica anônima
router.post('/checkin/face', verifyToken, asyncHandler(checkinFace));
// /checkin aceita JWT (usuários) OU X-API-Key (totens/kiosks) + rate limiter forense
router.post('/checkin', checkinLimiter, apiKeyOrToken(verifyToken), asyncHandler(check));

router.get('/exportar/:eventoId', verifyToken, adminOnly, asyncHandler(exportarCSV));

// Rotas com parâmetros dinâmicos no final
router.get('/:eventoId', verifyToken, asyncHandler(getConvidados));
router.post('/:eventoId', verifyToken, asyncHandler(createConvidado));
router.post('/:eventoId/massa', verifyToken, asyncHandler(createConvidadosMassa));
router.post('/:eventoId/importar', verifyToken, asyncHandler(importarEmMassa));
router.put('/:eventoId/:id', verifyToken, asyncHandler(updateConvidado));
router.put('/:eventoId/:id/face', verifyToken, asyncHandler(updateFaceDescriptor));
router.delete('/:eventoId/:id', verifyToken, adminOnly, asyncHandler(deleteConvidado));
// Fix Bug#8: Rota única e correta (tinha duplicata sem eventoId que causava crash)
router.put('/:eventoId/checkin/desfazer/:id', verifyToken, adminOnly, asyncHandler(desfazerCheckin));
router.get('/:eventoId/exportar-xlsx', verifyToken, adminOnly, asyncHandler(exportarXLSX));
router.get('/:eventoId/sorteio', verifyToken, asyncHandler(getSorteio));
router.post('/:eventoId/reset-checkins', verifyToken, adminOnly, asyncHandler(resetCheckins));

export default router;