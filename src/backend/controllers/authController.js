import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db, { registrarLog } from '../config/db.js';
import { AuthService } from '../services/authService.js';
import { env } from '../config/env.js';
import { Logger } from '../utils/logger.js';
import { usuarioSchema } from '../validations/schemas.js';
import { blacklistToken } from '../middlewares/authMiddleware.js';

const SALT_ROUNDS = 12; // Aumentado de 10 para 12 (melhor resistência a GPU)
const SECRET_KEY = env.JWT_SECRET;

/**
 * 🛠️ HELPER: Configuração do Cookie Seguro
 * Garante que o cookie não seja acessível via JavaScript (XSS)
 */
const setSecureCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true, // Impede acesso via document.cookie
    secure: env.NODE_ENV === 'production', // true se estiver em HTTPS
    sameSite: 'strict', // Proteção contra CSRF
    maxAge: 24 * 60 * 60 * 1000 // 24 horas (mesmo tempo do JWT)
  });
};

/**
 * 🔐 LOGIN (Fase 1: Credenciais Básicas)
 */
export const login = async (req, res) => {
  const { usuario, senha } = req.body;
  const ip = req.ip; // 🔒 FIX: Usa req.ip (resolução correta com trust proxy) em vez de x-forwarded-for manual

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
    }

    const user = rows[0];
    const senhaValida = await bcrypt.compare(senha, user.senha);
    
    if (!senhaValida) {
      return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos' });
    }

    // [ZENITH-UPGRADE] Verificação de 2FA Opcional
    if (user.two_factor_enabled) {
      // 🔒 FIX: Secret separada para partial token diminui superfície de ataque
      const PARTIAL_SECRET = SECRET_KEY + '_PARTIAL_2FA_ONLY';
      const partialToken = jwt.sign({ id: user.id, partial: true }, PARTIAL_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
      return res.json({ 
        success: true, 
        require2FA: true, 
        partialToken,
        nome: user.nome 
      });
    }

    // Login Direto (2FA Desabilitado)
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { algorithm: 'HS256', expiresIn: '24h' });
    
    // 🔐 CORREÇÃO: Seta o token APENAS como Cookie seguro (sem expor no body)
    setSecureCookie(res, token);
    
    await registrarLog(user.id, 'LOGIN', `Login realizado com sucesso (2FA Inativo)`, ip);

    // 🔒 FIX CRÍTICO: Token REMOVIDO do body. Apenas dados não sensíveis retornados.
    res.json({ 
      success: true, 
      role: user.role, 
      evento_id: user.evento_atribuido, 
      nome: user.nome,
      permissoes: typeof user.permissoes === 'string' ? JSON.parse(user.permissoes || '{}') : (user.permissoes || {})
    });
  } catch (error) {
    Logger.error('Erro no login:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

/**
 * 🔐 LOGIN-2STEP (Fase 2: Segundo Fator TOTP)
 */
export const login2Step = async (req, res) => {
  const { partialToken, otpToken, recoveryCode } = req.body;
  const ip = req.ip;

  try {
    // 🔒 FIX: Verifica com a PARTIAL_SECRET correta
    const PARTIAL_SECRET = SECRET_KEY + '_PARTIAL_2FA_ONLY';
    const decoded = jwt.verify(partialToken, PARTIAL_SECRET, { algorithms: ['HS256'] });
    if (!decoded.partial) throw new Error('Token inválido');

    const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [decoded.id]);
    const user = rows[0];

    let verificado = false;
    if (recoveryCode) {
      verificado = await AuthService.verifyRecoveryCode(user.id, recoveryCode);
    } else {
      verificado = await AuthService.verifyToken(user.two_factor_secret, otpToken, user.id);
    }

    if (!verificado) {
      return res.status(401).json({ success: false, message: 'Código inválido ou expirado' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { algorithm: 'HS256', expiresIn: '24h' });
    
    // 🔐 CORREÇÃO: Seta o token APENAS como Cookie seguro (sem expor no body)
    setSecureCookie(res, token);

    await registrarLog(user.id, 'LOGIN_2FA', `Login com 2FA: ${recoveryCode ? 'Recuperação' : 'TOTP'}`, ip);

    // 🔒 FIX CRÍTICO: Token REMOVIDO do body. Apenas dados não sensíveis retornados.
    res.json({ 
      success: true, 
      role: user.role, 
      evento_id: user.evento_atribuido, 
      nome: user.nome,
      permissoes: typeof user.permissoes === 'string' ? JSON.parse(user.permissoes || '{}') : (user.permissoes || {})
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Sessão expirada ou código inválido' });
  }
};

/**
 * 🚪 LOGOUT — Invalida o JWT via blacklist no servidor
 */
export const logout = async (req, res) => {
  try {
    // 🔒 FIX: Invalida o token no servidor via blacklist (evita uso do token mesmo após logout)
    if (req.user) {
      await blacklistToken(req.user);
    }
  } catch (e) {
    // Não propaga erro — o cookie será limpo de qualquer forma
  }
  
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ success: true, message: 'Logout realizado com sucesso' });
};


/**
 * 🛠️ CONFIGURAÇÃO DE 2FA (Setup)
 */
export const generate2FASetup = async (req, res) => {
  try {
    const [userRows] = await db.query('SELECT usuario, email FROM usuarios WHERE id = ?', [req.user.id]);
    const setup = await AuthService.generate2FA(req.user.id, userRows[0].usuario);
    
    // ✅ CORREÇÃO: Salva o segredo gerado no banco (mas não o ativa ainda) para evitar 
    // que o front-end envie um segredo forjado na próxima requisição.
    await db.query('UPDATE usuarios SET two_factor_secret = ? WHERE id = ?', [setup.secret, req.user.id]);
    
    // Remove o 'secret' da resposta para não expor a string limpa
    const { secret, ...safeSetup } = setup; 
    
    res.json({ success: true, ...safeSetup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyAndEnable2FA = async (req, res) => {
  const { token, recoveryCodes } = req.body;
  
  // ✅ CORREÇÃO: Lê o segredo diretamente do banco de dados (confiável), não do body (vulnerável).
  const [userRows] = await db.query('SELECT two_factor_secret FROM usuarios WHERE id = ?', [req.user.id]);
  const serverSecret = userRows[0]?.two_factor_secret;
  
  if (!serverSecret) {
      return res.status(400).json({ success: false, message: 'Processo de setup não iniciado. Solicite um novo QR Code.' });
  }

  const verificado = await AuthService.verifyToken(serverSecret, token, req.user.id);

  if (!verificado) {
    return res.status(400).json({ success: false, message: 'Código de verificação incorreto' });
  }

  await AuthService.enable2FA(req.user.id, serverSecret, recoveryCodes);
  res.json({ success: true, message: '2FA Habilitado com sucesso!' });
};

export const disable2FA = async (req, res) => {
  const { senha } = req.body;
  const ip = req.ip;

  try {
    if (!senha) {
      return res.status(400).json({ success: false, message: 'Senha é obrigatória para desativar o 2FA.' });
    }

    const [rows] = await db.query('SELECT senha, usuario FROM usuarios WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Usuário não encontrado' });

    const user = rows[0];
    const senhaValida = await bcrypt.compare(senha, user.senha);

    if (!senhaValida) {
      await registrarLog(req.user.id, '2FA_DISABLE_FAIL', `Tentativa de desativar 2FA com senha incorreta`, ip);
      return res.status(401).json({ success: false, message: 'Senha incorreta. Ação negada.' });
    }

    await AuthService.disable2FA(req.user.id);
    await registrarLog(req.user.id, '2FA_DISABLED', `2FA desativado pelo usuário`, ip);

    res.json({ success: true, message: '2FA Desabilitado com sucesso.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao desativar 2FA' });
  }
};

// --- MÉTODOS DE GESTÃO DE USUÁRIOS (Admin) ---

export const getUsuarios = async (req, res) => {
  const [rows] = await db.query(`
    SELECT 
        u.id, u.nome, u.usuario, u.role, u.evento_atribuido, u.permissoes, u.two_factor_enabled,
        (SELECT COUNT(*) FROM audit_logs WHERE usuario_id = u.id AND acao LIKE 'CHECKIN%') as total_checkins,
        (SELECT criado_em FROM audit_logs WHERE usuario_id = u.id ORDER BY criado_em DESC LIMIT 1) as ultimo_visto
    FROM usuarios u
  `);
  
  const dados = rows.map(u => ({
    ...u,
    permissoes: typeof u.permissoes === 'string' ? JSON.parse(u.permissoes || '{}') : (u.permissoes || {})
  }));
  
  res.json({ success: true, dados });
};

export const createUsuario = async (req, res) => {
  try {
    const { usuarioCreateSchema } = await import('../validations/schemas.js');
    const validatedData = usuarioCreateSchema.parse(req.body);
    const { nome, usuario, senha, role, permissoes } = validatedData;
    
    const [existing] = await db.query('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Nome de usuário "${usuario}" já existe.` });
    }
    
    const hash = await bcrypt.hash(senha, SALT_ROUNDS);
    const pJson = JSON.stringify(permissoes || {});
    await db.query('INSERT INTO usuarios (nome, usuario, senha, role, permissoes) VALUES (?, ?, ?, ?, ?)', 
      [nome, usuario, hash, role, pJson]);
    
    await registrarLog(req.user?.id, 'USUARIO_CRIADO', `Novo usuário: ${usuario} (Role: ${role})`, req.ip);
    res.json({ success: true });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({ success: false, message: 'Dados inválidos', errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUsuario = async (req, res) => {
  try {
    const validatedData = usuarioSchema.parse(req.body);
    const { nome, usuario, senha, role, permissoes } = validatedData;
    const { id } = req.params;
    const pJson = JSON.stringify(permissoes || {});
    
    if (senha) {
      const hash = await bcrypt.hash(senha, SALT_ROUNDS);
      await db.query('UPDATE usuarios SET nome=?, usuario=?, senha=?, role=?, permissoes=? WHERE id=?', 
        [nome, usuario, hash, role, pJson, id]);
    } else {
      await db.query('UPDATE usuarios SET nome=?, usuario=?, role=?, permissoes=? WHERE id=?', 
        [nome, usuario, role, pJson, id]);
    }

    await registrarLog(req.user?.id, 'USUARIO_ATUALIZADO', `Usuário ID ${id} modificado`, req.ip);
    res.json({ success: true });
  } catch (err) {
    if (err.errors) {
      return res.status(400).json({ success: false, message: 'Dados inválidos', errors: err.errors.map(e => e.message) });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUsuario = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user?.id) {
    return res.status(400).json({ success: false, message: 'Você não pode excluir a sua própria conta.' });
  }
  await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
  await registrarLog(req.user?.id, 'USUARIO_REMOVIDO', `ID ${id} excluído permanentemente`, req.ip);
  res.json({ success: true });
};

export const atribuirEvento = async (req, res) => {
  const { evento_id } = req.body;
  await db.query('UPDATE usuarios SET evento_atribuido = ? WHERE id = ?', [evento_id, req.params.id]);
  res.json({ success: true });
};