import { Router } from 'express';

import authRoutes from './auth.routes.js';
import eventosRoutes from './eventos.routes.js';
import convidadosRoutes from './convidados.routes.js';
import zenithRoutes from './zenith.routes.js';
import impressaoRoutes from './impressao.routes.js';
import apiKeysRoutes from './apikeys.routes.js';
import webhooksRoutes from './webhooks.routes.js';
import { verifyToken, adminOnly } from '../middlewares/authMiddleware.js';
import db, { registrarLog } from '../config/db.js';
import ExcelJS from 'exceljs';

const router = Router();

router.use('/', authRoutes);
router.use('/eventos', eventosRoutes);
router.use('/convidados', convidadosRoutes);
router.use('/stats', zenithRoutes);
router.use('/impressao', impressaoRoutes);
router.use('/admin/apikeys', apiKeysRoutes);
router.use('/admin/webhooks', webhooksRoutes);

// Aliases de retrocompatibilidade
router.get('/stats-consolidado', (req, res, next) => { req.url = '/consolidado'; zenithRoutes(req, res, next); });
router.get('/listar_eventos', verifyToken, (req, res, next) => { req.url = '/'; eventosRoutes(req, res, next); });

export default router;
