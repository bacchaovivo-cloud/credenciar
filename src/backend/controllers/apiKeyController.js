/**
 * 🔑 API KEYS CONTROLLER
 * CRUD para gerenciamento de API Keys de Totens por evento.
 */
import crypto from 'crypto';
import db from '../config/db.js';
import { registrarLog } from '../config/db.js';
import { Logger } from '../utils/logger.js';

/**
 * Gera uma nova API Key para um totem/kiosk.
 * A key é retornada UMA ÚNICA VEZ — apenas o hash é armazenado.
 */
export const gerarApiKey = async (req, res) => {
  const { evento_id, label, expira_em } = req.body;

  if (!evento_id || !label) {
    return res.status(400).json({ success: false, message: 'evento_id e label são obrigatórios.' });
  }

  try {
    // Gera key com prefixo legível: tk_ev{id}_{32 bytes hex}
    const rawKey = `tk_ev${evento_id}_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const [result] = await db.query(
      `INSERT INTO totem_api_keys (evento_id, key_hash, label, ativo, expira_em) VALUES (?, ?, ?, 1, ?)`,
      [evento_id, keyHash, label, expira_em || null]
    );

    await registrarLog(req.user?.id, 'APIKEY_CRIADA', `Totem: ${label} | Evento: ${evento_id}`, req.ip);

    Logger.info(`[ApiKey] Nova key gerada para totem "${label}" no evento ${evento_id}`);

    res.json({
      success: true,
      message: '⚠️ Guarde esta chave — ela não será exibida novamente.',
      api_key: rawKey,
      id: result.insertId,
      label,
      evento_id,
      expira_em: expira_em || null,
    });
  } catch (err) {
    Logger.error('[ApiKey] Erro ao gerar key:', err);
    res.status(500).json({ success: false, message: 'Erro ao gerar API Key.' });
  }
};

/** Lista todas as keys de um evento (sem mostrar o hash). */
export const listarApiKeys = async (req, res) => {
  const { eventoId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT id, evento_id, label, ativo, criado_em, expira_em, ultimo_uso
       FROM totem_api_keys WHERE evento_id = ? ORDER BY criado_em DESC`,
      [eventoId]
    );
    res.json({ success: true, dados: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Revoga (desativa) uma API Key pelo ID. */
export const revogarApiKey = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT label, evento_id FROM totem_api_keys WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Key não encontrada.' });

    await db.query('UPDATE totem_api_keys SET ativo = 0 WHERE id = ?', [id]);
    await registrarLog(req.user?.id, 'APIKEY_REVOGADA', `Key ID: ${id} | Totem: ${rows[0].label}`, req.ip);

    res.json({ success: true, message: `API Key "${rows[0].label}" revogada com sucesso.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
