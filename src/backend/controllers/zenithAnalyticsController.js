import db, { getEventTablesList } from '../config/db.js';
import { Logger } from '../utils/logger.js';
import { generateSignature } from '../utils/forensic.js';
import { PredictiveService } from '../services/predictiveService.js';
import { StatsService } from '../services/statsService.js';
import { ReportingService } from '../services/reportingService.js';

/**
 * 📊 ZENITH ANALYTICS CONTROLLER (Radical Relocation)
 */

export const zenithExportExcel = async (req, res) => {
    const { eventoId } = req.params;
    try {
        const workbook = await ReportingService.generateExecutiveExcel(eventoId);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=ZenithReport_${eventoId}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        Logger.error('Erro ao exportar Excel:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const zenithExportPDF = async (req, res) => {
    const { eventoId } = req.params;
    try {
        const doc = await ReportingService.generateExecutivePDF(eventoId);
        const pdfOutput = doc.output('arraybuffer');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ZenithReport_${eventoId}.pdf`);
        res.send(Buffer.from(pdfOutput));
    } catch (error) {
        Logger.error('Erro ao exportar PDF:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getStatsConsolidado = async (req, res) => {
  try {
    const dados = await StatsService.getStatsConsolidado();
    res.json({ success: true, dados });
  } catch (error) {
    Logger.error('Erro no Stats Consolidado:', error);
    res.status(500).json({ success: false, message: 'Erro ao consolidar estatísticas' });
  }
};

export const getStatsEvento = async (req, res) => {
  const { eventoId } = req.params;
  try {
    // Fix: getEventTablesList dentro do try — evita erro 500 genérico para eventoId inválido
    const { logsTable } = getEventTablesList(eventoId);
    const stats = await StatsService.getStatsEvento(eventoId);
    const produtividade = await StatsService.getProdutividade(eventoId, logsTable);
    
    res.json({
      success: true,
      dados: {
        ...stats,
        produtividade,
        anomaliasRecentesMod: stats.anomaliasRecentes?.length || 0
      }
    });
  } catch (error) {
    Logger.error(`Erro nas estatísticas do evento ${eventoId}:`, error);
    const status = error.message?.includes('[SECURITY]') ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const getLogsForenses = async (req, res) => {
  try {
    let q = 'SELECT l.*, u.nome as operador_nome FROM audit_logs l LEFT JOIN usuarios u ON u.id = l.usuario_id';
    let p = [];
    if (req.user?.role === 'MANAGER' && req.user?.evento_atribuido) {
       q += ' WHERE (l.detalhes LIKE ? OR l.usuario_id IN (SELECT id FROM usuarios WHERE evento_atribuido = ?))';
       p.push(`%${req.user.evento_atribuido}%`, req.user.evento_atribuido);
    }
    q += ' ORDER BY l.criado_em DESC LIMIT 200';
    const [rows] = await db.query(q, p);
    res.json({ success: true, dados: rows });
  } catch (error) {
    Logger.error('Erro ao buscar logs forenses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyAuditChain = async (req, res) => {
    try {
        // Fix OOM: COUNT(*) em vez de SELECT * — evita carregar toda a tabela em memória
        const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM audit_logs');
        res.json({ success: true, total });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getHistoricoConvidado = async (req, res) => {
  const { id, eventoId } = req.params;
  try {
    // Fix: getEventTablesList dentro do try — retorna 400 correto em vez de 500 genérico
    const { logsTable } = getEventTablesList(eventoId);
    const [rows] = await db.query(
      `SELECT l.*, u.nome as usuario_nome, 'CHECKIN' as tipo 
       FROM ${logsTable} l 
       LEFT JOIN usuarios u ON u.id = l.usuario_id 
       WHERE l.convidado_id = ? ORDER BY l.criado_em DESC`,
      [id]
    );
    res.json({ success: true, dados: rows });
  } catch (err) {
    const status = err.message?.includes('[SECURITY]') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

export const getPredictiveStats = async (req, res) => {
    const { eventoId } = req.params;
    try {
        const stats = await PredictiveService.analyzeEventFlow(eventoId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
