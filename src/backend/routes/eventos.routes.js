import { Router } from 'express';
import fs from 'fs';
import { 
  getEventos, getPublicEvents, getEventoById, createEvento, updateEvento, deleteEvento, 
  getSetores, addSetor, deleteSetor, 
  uploadLogo, uploadBackground, 
  getLabelConfig, updateLabelConfig 
} from '../controllers/eventosController.js';
import multer from 'multer';
import path from 'path';
import { backupEvento } from '../controllers/backupController.js';
import { verifyToken, adminOnly, checkRole } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 🔒 CORREÇÃO CRÍTICA: Standardizado para a pasta 'uploads' na raiz do projeto
    const uploadPath = path.join(process.cwd(), 'uploads', 'events');
    
    // Auto-correção: Cria a pasta se não existir para evitar crash no Multer
    try {
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log('📦 Diretório de uploads criado:', uploadPath);
      }
    } catch (err) {
      console.error('❌ Falha ao criar diretório de uploads:', err);
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const mimetypesValidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const ext = path.extname(file.originalname).toLowerCase();
  const extensoesValidas = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

  if (mimetypesValidos.includes(file.mimetype) && extensoesValidas.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas.'));
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

const router = Router();

// --- ROTA PÚBLICA (Deve vir antes do /:id para não dar conflito) ---
// 🔒 CORREÇÃO: Rota específica para a tela de vendas (sem vazar dados sensíveis)
router.get('/public', asyncHandler(getPublicEvents));

// --- CRUDS BÁSICOS ---
// 🔒 CORREÇÃO: verifyToken adicionado. Agora ninguém puxa o banco de eventos sem login.
router.get('/', verifyToken, asyncHandler(getEventos));
router.get('/:id', verifyToken, asyncHandler(getEventoById));
router.post('/', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(createEvento));
router.put('/:id', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(updateEvento));
router.delete('/:id', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(deleteEvento));

// --- GESTÃO DE SETORES ---
router.get('/:id/setores', verifyToken, asyncHandler(getSetores));
router.post('/:id/setores', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(addSetor));
router.delete('/:id/setores/:setorId', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(deleteSetor));

// 📦 MOTOR DE BACKUP ISOLADO
router.get('/:id/backup', verifyToken, adminOnly, backupEvento);

// 🎨 CUSTOMIZAÇÃO DE MARCA & DESIGN (LOGO / BG / LABEL)
router.post('/:id/upload-logo', verifyToken, checkRole(['ADMIN', 'MANAGER']), upload.single('logo'), asyncHandler(uploadLogo));
router.post('/:id/upload-bg', verifyToken, checkRole(['ADMIN', 'MANAGER']), upload.single('background'), asyncHandler(uploadBackground));
router.get('/:id/label-config', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(getLabelConfig));
router.put('/:id/label-config', verifyToken, checkRole(['ADMIN', 'MANAGER']), asyncHandler(updateLabelConfig));

export default router;