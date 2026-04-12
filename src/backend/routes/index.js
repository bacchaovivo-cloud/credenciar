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

// 🔐 FIX CRÍTICO-01: Endpoint /me para re-hidratação de sessão sem localStorage
// O frontend chama este endpoint ao carregar para obter role/permissões do cookie httpOnly
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nome, usuario, role, evento_atribuido, permissoes FROM usuarios WHERE id = ?', 
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    const u = rows[0];
    res.json({ 
      success: true, 
      role: u.role,
      nome: u.nome,
      evento_id: u.evento_atribuido,
      permissoes: typeof u.permissoes === 'string' ? JSON.parse(u.permissoes || '{}') : (u.permissoes || {})
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao buscar sessão.' });
  }
});

export default router;
