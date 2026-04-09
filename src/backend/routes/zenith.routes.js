import { Router } from 'express';
import * as ZenithAnalytics from '../controllers/zenithAnalyticsController.js';
import { getGlobalStats } from '../controllers/executiveController.js';
import { verifyToken, adminOnly, checkRole } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// ⚠️ Específicos antes de /:eventoId
router.get('/consolidado', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(ZenithAnalytics.getStatsConsolidado));
router.get('/global', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(getGlobalStats));

// --- 📊 ZENITH ANALYTICS PRO ---
router.get('/report/excel/:eventoId', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(ZenithAnalytics.zenithExportExcel));
router.get('/report/pdf/:eventoId', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(ZenithAnalytics.zenithExportPDF));

// --- 🛡️ ZENITH FORENSIC & AI ENGINE ---
router.get('/logs-forenses', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(ZenithAnalytics.getLogsForenses));
router.post('/logs/verificar', verifyToken, adminOnly, asyncHandler(ZenithAnalytics.verifyAuditChain));
router.get('/predictive/:eventoId', verifyToken, asyncHandler(ZenithAnalytics.getPredictiveStats));

router.get('/historico/:eventoId/:id', verifyToken, asyncHandler(ZenithAnalytics.getHistoricoConvidado));
router.get('/:eventoId', verifyToken, asyncHandler(ZenithAnalytics.getStatsEvento));

export default router;
