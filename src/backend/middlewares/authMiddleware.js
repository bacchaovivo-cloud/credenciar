import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { CacheService } from '../services/cacheService.js';

const SECRET_KEY = env.JWT_SECRET;

/**
 * Blacklist de JTI para logout seguro.
 * A chave é: jwt_blacklist:<userId>:<iat>
 * O TTL é 24h (mesmo TTL do token).
 */
export const blacklistToken = async (decoded) => {
  const key = `jwt_blacklist:${decoded.id}:${decoded.iat}`;
  // TTL em ms: restante da validade do token (max 24h)
  const remainingMs = Math.max(0, (decoded.exp - Math.floor(Date.now() / 1000)) * 1000);
  await CacheService.set(key, '1', remainingMs || 86400000);
};

const isBlacklisted = async (decoded) => {
  const key = `jwt_blacklist:${decoded.id}:${decoded.iat}`;
  return !!(await CacheService.get(key));
};

export const verifyToken = async (req, res, next) => {
  const header = req.headers['authorization'];
  let token = header && header.split(' ')[1];
  
  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido.' });
  
  try {
    // Fix: algoritmo explícito para prevenir ataque 'alg: none'
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
    
    // 🔐 HARDENING: Verifica blacklist (tokens invalidados via logout)
    if (await isBlacklisted(decoded)) {
      return res.status(401).json({ success: false, message: 'Token Rejeitado (Sessão encerrada).' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Token Rejeitado (Sessão Expirada ou Inválida)' });
  }
};

export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = (req.user?.role || '').toUpperCase();
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: `Acesso Negado: Papel ${userRole} insuficiente para esta ação.` 
      });
    }
    next();
  };
};

export const adminOnly = checkRole(['ADMIN']);
