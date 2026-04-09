import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const SECRET_KEY = env.JWT_SECRET;

export const verifyToken = (req, res, next) => {
  const header = req.headers['authorization'];
  let token = header && header.split(' ')[1];
  
  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ success: false, message: 'Token não fornecido.' });
  
  try {
    // Fix: algoritmo explícito para prevenir ataque 'alg: none'
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
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
