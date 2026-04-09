import db, { getEventTablesList } from '../config/db.js';
import { BrotherService } from '../services/brotherService.js';
import { CheckinService } from '../services/checkinService.js';
import { Logger } from '../utils/logger.js';

/**
 * Controller reforçado para ALTA CONCORRÊNCIA e múltiplas estações
 */
export const registrarECredenciar = async (req, res) => {
  const { qrcode, evento_id, printer_ip, printer_port, station_id, data_ponto } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const result = await CheckinService.processarCheckin({
        qrcode,
        evento_id,
        ip,
        station_id,
        printer_ip,
        printer_port,
        data_ponto
    });

    // Emissão para o dashboard em tempo real
    const io = req.app.get('io');
    if (io && result.success) {
        io.emit('checkin', {
            id: result.participante.id,
            nome: result.participante.nome,
            evento_id,
            total_presentes: result.participante.total_presentes, // Se o service retornar
            tipo: 'CREDENCIAMENTO'
        });
        
        // Atualiza stats de fila
        const stats = await statusFilaInternal(evento_id);
        io.emit('stats_update', { evento_id, stats });
    }

    res.json(result);
  } catch (error) {
    Logger.error('Erro no registrarECredenciar via Controller:', error);
    res.json({ 
        success: false, 
        message: error.message 
    });
  }
};


/**
 * Endpoint de diagnóstico de impressora (Ping TCP)
 */
export const testarImpressora = async (req, res) => {
  const { printer_ip, printer_port } = req.body;
  try {
    await BrotherService.testPrinter(printer_ip, printer_port || 9100);
    res.json({ success: true, message: '✅ Impressora Online!' });
  } catch (err) {
    res.status(500).json({ success: false, message: `❌ Erro: ${err.message}` });
  }
};

export const statusFilaInternal = async (eventoId) => {
  const { logsTable } = getEventTablesList(eventoId);
  
  // 1. Status básico da fila física
  const [stats] = await db.query(
    `SELECT 
      SUM(CASE WHEN status = 'PENDENTE' OR status = 'PROCESSANDO' THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN status = 'FALHA' THEN 1 ELSE 0 END) as falhas
     FROM print_jobs WHERE evento_id = ?`,
    [eventoId]
  );

  // 2. Cálculo de Vazão (Últimos 15 minutos)
  const [vazao] = await db.query(
    `SELECT COUNT(*) as total_recente 
     FROM ${logsTable} 
     WHERE criado_em > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
    []
  );

  const checkinsPorMinuto = (vazao[0].total_recente / 15).toFixed(1);
  const pendentes = stats[0].pendentes || 0;
  
  // Estimativa Conservadora: 3s por etiqueta
  const tempoEstimadoSegundos = Math.ceil(pendentes * 3); 

  return { 
    ...stats[0],
    taxa_por_minuto: parseFloat(checkinsPorMinuto),
    tempo_estimado_segundos: tempoEstimadoSegundos,
    is_gargalo: pendentes > 25 
  };
};

/**
 * Status da fila de impressão + Métricas de Vazão (Real-time)
 */
export const statusFila = async (req, res) => {
  const { eventoId } = req.params;
  try {
    const stats = await statusFilaInternal(eventoId);
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Reimpressão manual
 */
export const reimprimirCheckin = async (req, res) => {
  const { convidadoId } = req.params;
  const { printer_ip, printer_port, evento_id } = req.body;
  const { convTable } = getEventTablesList(evento_id);

  try {
    const [rows] = await db.query(`SELECT id, nome, categoria, qrcode, empresa, cargo FROM ${convTable} WHERE id = ?`, [convidadoId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Não encontrado.' });

    const p = rows[0];
    await BrotherService.enqueue(p, evento_id, printer_ip, printer_port);

    res.json({ success: true, message: '🖨️ Reimpressão enviada!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
