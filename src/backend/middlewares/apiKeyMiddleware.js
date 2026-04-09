/**
 * 🔑 API KEY MIDDLEWARE (Totem/Kiosk Authentication)
 * Autentica requisições de dispositivos edge usando API Keys por evento.
 *
 * Header esperado: X-API-Key: tk_ev1_abc123...
 *
 * Diferente do JWT:
 *   - Keys são por evento, não por usuário
 *   - Sem expiração durante o evento (configurável)
 *   - Revogáveis individualmente por key ID
 *   - Rate limiting separado por key (não por IP)
 */
import crypto from 'crypto';
import db from '../config/db.js';
import { Logger } from '../utils/logger.js';

/**
 * Middleware que aceita autenticação via X-API-Key.
 * Injeta req.totem = { id, evento_id, label } e req.user = { id: null, role: 'TOTEM' }.
 */
export const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return next(); // Sem key, passa para o próximo middleware (ex: verifyToken)

  try {
    // Hash da key para comparar com o banco (nunca armazenamos a key em plaintext)
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const [rows] = await db.query(
      `SELECT k.*, e.nome as evento_nome 
       FROM totem_api_keys k
       JOIN eventos e ON e.id = k.evento_id
       WHERE k.key_hash = ? AND k.ativo = 1
         AND (k.expira_em IS NULL OR k.expira_em > NOW())`,
      [keyHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'API Key inválida, expirada ou revogada.',
      });
    }

    const totem = rows[0];

    // Injeta contexto no request — compatível com o resto do sistema
    req.totem = {
      id: totem.id,
      evento_id: totem.evento_id,
      label: totem.label,
      evento_nome: totem.evento_nome,
    };
    req.user = {
      id: null,
      role: 'TOTEM',
      evento_atribuido: totem.evento_id,
    };

    // Atualiza último uso (async, não bloqueante)
    db.query('UPDATE totem_api_keys SET ultimo_uso = NOW() WHERE id = ?', [totem.id]).catch(() => {});

    Logger.info(`[ApiKey] Totem autenticado: ${totem.label} | Evento: ${totem.evento_nome}`, {
      totem_id: totem.id,
      evento_id: totem.evento_id,
      ip: req.ip,
    });

    next();
  } catch (err) {
    Logger.error('[ApiKey] Erro na validação da API Key:', err);
    return res.status(500).json({ success: false, message: 'Erro na autenticação do dispositivo.' });
  }
};

/**
 * Middleware que exige autenticação por API Key OU JWT válido.
 * Usado nas rotas de check-in onde tanto usuários quanto totens podem operar.
 */
export const apiKeyOrToken = (verifyToken) => async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    return apiKeyAuth(req, res, next);
  }

  return verifyToken(req, res, next);
};
