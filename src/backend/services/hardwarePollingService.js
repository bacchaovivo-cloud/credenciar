import { BrotherService } from './brotherService.js';
import { Logger } from '../utils/logger.js';
import db from '../config/db.js';

/**
 * 🛰️ HARDWARE POLLING SERVICE
 * Monitora proativamente a saúde das impressoras Brother via TCP.
 */
export const HardwarePollingService = {
  activePolls: new Set(),
  interval: 15000, // 15 segundos entre cada ping de saúde

  async start(io) {
    if (!io) return;
    Logger.info('🛰️ HW-POLLING: Iniciando monitoramento proativo de hardware...');

    const runPoll = async () => {
      try {
        // Busca todas as impressoras ativas nos jobs recentes ou configurações
        const [printers] = await db.query(
          'SELECT DISTINCT printer_ip, printer_port FROM print_jobs WHERE criado_em > (NOW() - INTERVAL 1 HOUR)'
        );

        for (const p of printers) {
          try {
            const health = await BrotherService.getPrinterStatus(p.printer_ip, p.printer_port);
            if (health.status !== 'READY') {
              io.emit('printer_alert', { ip: p.printer_ip, status: health.status });
            } else {
              // Se estava com erro e agora está pronto, remove o alerta
              io.emit('printer_ready', { ip: p.printer_ip });
            }
          } catch (err) {
            // Se falhar a conexão, emitir OFFLINE
            io.emit('printer_alert', { ip: p.printer_ip, status: 'OFFLINE' });
          }
        }
      } catch (e) {
        Logger.error('❌ HW-POLLING: Falha no ciclo de monitoramento:', e);
      }
      setTimeout(runPoll, this.interval);
    };

    runPoll();
  }
};
