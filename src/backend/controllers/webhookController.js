/**
 * 🔔 WEBHOOK CONTROLLER
 * CRUD para gerenciamento de subscriptions de webhook B2B.
 */
import crypto from 'crypto';
import db from '../config/db.js';
import { registrarLog } from '../config/db.js';
import { Logger } from '../utils/logger.js';

/** Cadastra nova URL de webhook para um evento. */
export const criarWebhook = async (req, res) => {
  const { evento_id, url, eventos } = req.body;

  if (!evento_id || !url) {
    return res.status(400).json({ success: false, message: 'evento_id e url são obrigatórios.' });
  }

  try {
    // Valida formato básico da URL
    new URL(url);
  } catch {
    return res.status(400).json({ success: false, message: 'URL de webhook inválida.' });
  }

  try {
    // Gera secret HMAC único para esta subscription
    const secret = crypto.randomBytes(24).toString('hex');
    const eventosJson = JSON.stringify(eventos || ['checkin']);

    const [result] = await db.query(
      `INSERT INTO webhook_subscriptions (evento_id, url, secret, eventos, ativo) VALUES (?, ?, ?, ?, 1)`,
      [evento_id, url, secret, eventosJson]
    );

    await registrarLog(req.user?.id, 'WEBHOOK_CRIADO', `URL: ${url} | Evento: ${evento_id}`, req.ip);

    res.json({
      success: true,
      id: result.insertId,
      url,
      evento_id,
      eventos: eventos || ['checkin'],
      secret, // Retornado UMA VEZ para configurar o receptor
      message: '⚠️ Guarde o secret — ele não será exibido novamente.',
    });
  } catch (err) {
    Logger.error('[Webhook] Erro ao criar subscription:', err);
    res.status(500).json({ success: false, message: 'Erro ao cadastrar webhook.' });
  }
};

/** Lista webhooks de um evento (sem o secret). */
export const listarWebhooks = async (req, res) => {
  const { eventoId } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT id, evento_id, url, eventos, ativo, criado_em FROM webhook_subscriptions WHERE evento_id = ? ORDER BY criado_em DESC`,
      [eventoId]
    );
    // Busca também últimas entregas para diagnóstico
    const ids = rows.map(r => r.id);
    let deliveries = [];
    if (ids.length > 0) {
      [deliveries] = await db.query(
        `SELECT subscription_id, status, http_status, criado_em FROM webhook_deliveries
         WHERE subscription_id IN (${ids.map(() => '?').join(',')}) ORDER BY criado_em DESC LIMIT 20`,
        ids
      );
    }
    const deliveriesBySubId = deliveries.reduce((acc, d) => {
      acc[d.subscription_id] = acc[d.subscription_id] || [];
      acc[d.subscription_id].push(d);
      return acc;
    }, {});

    const dados = rows.map(r => ({
      ...r,
      eventos: typeof r.eventos === 'string' ? JSON.parse(r.eventos) : r.eventos,
      ultimas_entregas: deliveriesBySubId[r.id] || [],
    }));

    res.json({ success: true, dados });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Remove (desativa) um webhook. */
export const removerWebhook = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT url, evento_id FROM webhook_subscriptions WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Webhook não encontrado.' });

    await db.query('UPDATE webhook_subscriptions SET ativo = 0 WHERE id = ?', [id]);
    await registrarLog(req.user?.id, 'WEBHOOK_REMOVIDO', `URL: ${rows[0].url} | Evento: ${rows[0].evento_id}`, req.ip);

    res.json({ success: true, message: 'Webhook desativado com sucesso.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Retorna histórico de entregas de um webhook. */
export const historicoEntregas = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT id, status, http_status, tentativas, resposta, criado_em
       FROM webhook_deliveries WHERE subscription_id = ? ORDER BY criado_em DESC LIMIT 50`,
      [id]
    );
    res.json({ success: true, dados: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
