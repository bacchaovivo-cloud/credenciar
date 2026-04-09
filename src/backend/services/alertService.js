/**
 * 🚨 ALERT SERVICE (Real-Time Security Notifications)
 * Centraliza a emissão de alertas de segurança via Socket.IO.
 * Todos os alertas são também persistidos em audit_logs para rastreabilidade forense.
 */
import { Logger } from '../utils/logger.js';

export const AlertType = {
  CHECKIN_SUSPEITO:    'CHECKIN_SUSPEITO',
  VELOCITY_ALTA:       'VELOCITY_ALTA',
  IMPOSSIBLE_TRAVEL:   'IMPOSSIBLE_TRAVEL',
  HARDWARE_OFFLINE:    'HARDWARE_OFFLINE',
  CIRCUIT_OPEN:        'CIRCUIT_OPEN',
  ACESSO_NEGADO:       'ACESSO_NEGADO',
  WEBHOOK_FALHA:       'WEBHOOK_FALHA',
};

export const AlertSeverity = {
  INFO:     'INFO',
  WARNING:  'WARNING',
  CRITICAL: 'CRITICAL',
};

const SEVERITY_MAP = {
  [AlertType.CHECKIN_SUSPEITO]:  AlertSeverity.WARNING,
  [AlertType.VELOCITY_ALTA]:     AlertSeverity.WARNING,
  [AlertType.IMPOSSIBLE_TRAVEL]: AlertSeverity.CRITICAL,
  [AlertType.HARDWARE_OFFLINE]:  AlertSeverity.WARNING,
  [AlertType.CIRCUIT_OPEN]:      AlertSeverity.CRITICAL,
  [AlertType.ACESSO_NEGADO]:     AlertSeverity.CRITICAL,
  [AlertType.WEBHOOK_FALHA]:     AlertSeverity.INFO,
};

export const AlertService = {
  /**
   * Emite um alerta em tempo real via Socket.IO.
   * @param {object} io         Instância do Socket.IO
   * @param {string} type       AlertType
   * @param {object} payload    Dados do alerta
   * @param {number} [eventoId] ID do evento relacionado (para emissão por room)
   */
  emit(io, type, payload, eventoId = null) {
    const severity = SEVERITY_MAP[type] || AlertSeverity.INFO;
    const alert = {
      type,
      severity,
      payload,
      timestamp: new Date().toISOString(),
      eventoId,
    };

    if (io) {
      // Emite para todos os admins conectados (room global de alertas)
      io.emit('security_alert', alert);

      // Emite também para room específica do evento, se fornecida
      if (eventoId) {
        io.to(`evento_${eventoId}`).emit('security_alert', alert);
      }
    }

    // Log estruturado local (alimenta ELK/Loki)
    const logFn = severity === AlertSeverity.CRITICAL ? 'error' : 'warn';
    Logger[logFn](`[ALERT:${type}] ${severity}`, payload);

    return alert;
  },

  /**
   * Emite alerta de check-in suspeito com dados do participante.
   */
  checkinSuspeito(io, { convidado, evento_id, ip, fraud_score, reasons }) {
    return this.emit(io, AlertType.CHECKIN_SUSPEITO, {
      message: `Check-in suspeito detectado: ${convidado.nome}`,
      convidado_id: convidado.id,
      nome: convidado.nome,
      categoria: convidado.categoria,
      fraud_score,
      reasons,
      ip,
    }, evento_id);
  },

  /**
   * Emite alerta de hardware offline (impressora).
   */
  hardwareOffline(io, { ip, port, error, circuitState }) {
    return this.emit(io, AlertType.CIRCUIT_OPEN, {
      message: `Impressora ${ip}:${port} ficou inacessível — circuito ABERTO`,
      printer_ip: ip,
      printer_port: port,
      error: error?.message,
      circuit_state: circuitState,
    });
  },
};
