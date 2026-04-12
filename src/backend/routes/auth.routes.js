import { Router } from 'express';
import { 
  login, 
  login2Step,
  logout,
  getUsuarios, 
  createUsuario, 
  updateUsuario, 
  deleteUsuario, 
  atribuirEvento,
  generate2FASetup,
  verifyAndEnable2FA,
  disable2FA
} from '../controllers/authController.js';
import { verifyToken, adminOnly } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/login/2step', authLimiter, login2Step); // Fix: Rate limit para prevenir brute-force de TOTP

// 🔒 FIX ALTO-06: Logout exige token válido para poder adicioná-lo na blacklist
router.post('/logout', verifyToken, logout);

// Configuração de 2FA (Zenith Excellence)
router.post('/2fa/generate', verifyToken, generate2FASetup);
router.post('/2fa/verify', verifyToken, verifyAndEnable2FA);
router.post('/2fa/disable', verifyToken, disable2FA);

router.get('/usuarios', verifyToken, adminOnly, getUsuarios);
router.post('/usuarios', verifyToken, adminOnly, createUsuario);
router.put('/usuarios/:id', verifyToken, adminOnly, updateUsuario);
router.delete('/usuarios/:id', verifyToken, adminOnly, deleteUsuario);
router.put('/usuarios/:id/atribuir', verifyToken, adminOnly, atribuirEvento);

export default router;
