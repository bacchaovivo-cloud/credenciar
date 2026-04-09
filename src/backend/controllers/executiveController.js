import db, { getEventTablesList } from '../config/db.js';
import { PredictiveService } from '../services/predictiveService.js';

/**
 * 🎛️ EXECUTIVE COMMAND CENTER CONTROLLER
 * Agrega dados de todos os eventos ativos para visão C-Level.
 */
export const getGlobalStats = async (req, res) => {
  try {
    const [eventos] = await db.query('SELECT id, nome, cor_primaria, capacidade_total FROM eventos');
    
    let globalStats = {
      totalInscritos: 0,
      totalCheckins: 0,
      fluxoGlobal: 0,
      eventosAtivos: eventos.length,
      alertasSeguranca: 0,
      eventosList: [],
      recentAlerts: []
    };

    let totalVelocity = 0;

    for (const ev of eventos) {
        const tables = getEventTablesList(ev.id);
        if (!tables) continue;

        try {
            // Chama a Inteligência Preditiva
            const analysis = await PredictiveService.analyzeEventFlow(ev.id);
            const metrics = analysis.metrics;

            globalStats.totalInscritos += parseInt(metrics.total) || 0;
            globalStats.totalCheckins += parseInt(metrics.presentes) || 0;
            totalVelocity += parseFloat(metrics.velocity) || 0;

            globalStats.eventosList.push({
                id: ev.id,
                nome: ev.nome,
                cor: ev.cor_primaria,
                total: metrics.total,
                presentes: metrics.presentes,
                percentual: metrics.occupancy_percent,
                predictive: {
                    velocity: metrics.velocity,
                    eta: metrics.eta_minutes,
                    risk: metrics.bottleneckRisk
                }
            });
        } catch (e) {
            console.error(`[EXEC-DASH-ERR] Evento ${ev.id}:`, e.message);
        }
    }

    globalStats.fluxoGlobal = (totalVelocity / (eventos.length || 1)).toFixed(1);

    // 3. Busca Fotos Recentes (Zenith Forensic Vault)
    let recentPhotos = [];
    for (const ev of eventos) {
        const tables = getEventTablesList(ev.id);
        if (!tables) continue;
        try {
            const [photos] = await db.query(`
                SELECT 
                    c.nome, 
                    l.checkin_photo, 
                    l.criado_em,
                    '${ev.nome}' as evento_nome
                FROM ${tables.logsTable} l
                JOIN ${tables.convTable} c ON c.id = l.convidado_id
                WHERE l.checkin_photo IS NOT NULL
                ORDER BY l.criado_em DESC LIMIT 4
            `);
            recentPhotos.push(...photos);
        } catch (e) {}
    }
    globalStats.recentPhotos = recentPhotos.sort((a,b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 8);

    // 4. Busca Alertas (Zenith Guardian) - Blindado

    res.json({ success: true, dados: globalStats });
  } catch (error) {
    console.error('Erro Fatal no Executive Controller:', error);
    res.status(500).json({ success: false, message: 'Erro ao carregar visão executiva.' });
  }
};
