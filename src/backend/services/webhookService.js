/**
 * 🔔 WEBHOOK SERVICE (B2B Integration Engine)
 * Dispara notificações HTTP para sistemas externos após eventos do CRM.
 *
 * Features:
 *   - Assinatura HMAC-SHA256 no header X-Webhook-Signature
 *   - Retry automático com backoff exponencial (3 tentativas)
 *   - Log de cada entrega em webhook_deliveries
 *   - Não bloqueia o fluxo principal (fire-and-forget com log)
 */
import crypto from 'crypto';
import db from '../config/db.js';
import { Logger } from '../utils/logger.js';

export const WebhookEvent = {
  CHECKIN:          'checkin',
  CHECKIN_SUSPEITO: 'checkin.suspeito',
  EVENTO_CRIADO:    'evento.criado',
  EVENTO_EXCLUIDO:  'evento.excluido',
};

export const WebhookService = {
  /**
   * Dispara webhook para todos os assinantes ativos de um evento.
   * Não-bloqueante: erros são logados mas não propagados.
   *
   * @param {number} evento_id
   * @param {string} eventType  WebhookEvent
   * @param {object} payload
   */
  async dispatch(evento_id, eventType, payload) {
    try {
      const [subscriptions] = await db.query(
        `SELECT * FROM webhook_subscriptions WHERE evento_id = ? AND ativo = 1`,
        [evento_id]
      );

      if (subscriptions.length === 0) return;

      // Dispara todos em paralelo sem bloquear o processo principal
      Promise.allSettled(
        subscriptions.map(sub => this._deliver(sub, eventType, payload))
      );
    } catch (err) {
      Logger.error('[WebhookService] Erro ao buscar subscriptions:', err);
    }
  },

  /**
   * Entrega o webhook para uma subscription específica com retry.
   */
  async _deliver(subscription, eventType, payload, attempt = 1) {
    const body = JSON.stringify({
      id: crypto.randomUUID(),
      evento: eventType,
      timestamp: new Date().toISOString(),
      evento_id: subscription.evento_id,
      data: payload,
    });

    const signature = this._sign(body, subscription.secret);
    const deliveryId = await this._logDelivery(subscription.id, body, 'PENDENTE');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': eventType,
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Delivery': deliveryId?.toString(),
          'User-Agent': 'BacchCRM-Webhook/8.0',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const status = response.ok ? 'ENTREGUE' : 'FALHA';
      await this._updateDelivery(deliveryId, status, response.status, await response.text().catch(() => ''));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      Logger.info(`[Webhook] Entregue: ${subscription.url} | Evento: ${eventType} | HTTP ${response.status}`);
    } catch (err) {
      await this._updateDelivery(deliveryId, 'FALHA', null, err.message);

      if (attempt < 3) {
        // Backoff exponencial: 5s, 15s, 45s
        const delay = 5000 * Math.pow(3, attempt - 1);
        Logger.warn(`[Webhook] Tentativa ${attempt} falhou para ${subscription.url}. Retry em ${delay / 1000}s`);
        await new Promise(r => setTimeout(r, delay));
        return this._deliver(subscription, eventType, payload, attempt + 1);
      }

      Logger.error(`[Webhook] Todas as tentativas falharam para ${subscription.url}:`, err);
    }
  },

  /**
   * Gera assinatura HMAC-SHA256 do payload.
   */
  _sign(body, secret) {
    return crypto.createHmac('sha256', secret || 'bacch-default-secret').update(body).digest('hex');
  },

  async _logDelivery(subscriptionId, payload, status) {
    try {
      const [r] = await db.query(
        `INSERT INTO webhook_deliveries (subscription_id, payload, status, tentativas) VALUES (?, ?, ?, 1)`,
        [subscriptionId, payload, status]
      );
      return r.insertId;
    } catch { return null; }
  },

  async _updateDelivery(deliveryId, status, httpStatus, resposta) {
    if (!deliveryId) return;
    try {
      await db.query(
        `UPDATE webhook_deliveries SET status = ?, http_status = ?, resposta = ?, tentativas = tentativas + 1 WHERE id = ?`,
        [status, httpStatus, resposta?.substring(0, 1000), deliveryId]
      );
    } catch { /* silencioso */ }
  },

  /** Verifica assinatura vinda de um webhook recebido (para endpoints de recepção) */
  verifySignature(rawBody, signature, secret) {
    const expected = `sha256=${this._sign(rawBody, secret)}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  },
};
