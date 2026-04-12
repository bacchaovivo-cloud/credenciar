import { registrarLog } from '../config/db.js';
import { Logger } from '../utils/logger.js';

/**
 * 🕵️‍♂️ AUDIT MIDDLEWARE (Enterprise Admin Trail)
 * Captura ações administrativas e as registra no Audit Log com SHA-256 signatures.
 */
export const auditAction = (acaoOverride = null) => async (req, res, next) => {
  const originalJson = res.json;
  // 🔒 FIX ALTO-01: req.ip é resolvido corretamente pelo Express via trust proxy
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  // Intercepta a resposta para registrar APENAS SUCESSOS
  res.json = function (data) {
    if (data && data.success !== false && (res.statusCode >= 200 && res.statusCode < 300)) {
       const acao = acaoOverride || `${req.method} ${req.originalUrl}`;
       const usuarioId = req.user?.id || null;
       // Fix #15: Trunca body para evitar linhas de MB no audit_logs em importações em massa
       const bodyStr = req.method === 'DELETE' ? JSON.stringify(req.body) : 'Omitido';
       const detalhes = JSON.stringify({
          params: req.params,
          body: bodyStr.length > 500 ? bodyStr.substring(0, 500) + '...[TRUNCADO]' : bodyStr,
          query: req.query
       });

       registrarLog(usuarioId, acao, detalhes, ip, userAgent)
        .catch(err => Logger.error('Falha ao registrar Audit Log automático:', err));
    }
    return originalJson.apply(res, arguments);
  };

  next();
};
