import db, { getEventTablesList } from '../config/db.js';
import { Logger } from '../utils/logger.js';

/**
 * 🧠 ZENITH AI PREDICTIVE SERVICE
 * Analisa tendências de fluxo e calcula métricas operacionais avançadas.
 */
export const PredictiveService = {
    
    async analyzeEventFlow(eventoId) {
        const { logsTable, convTable } = getEventTablesList(eventoId);
        
        try {
            // 1. Velocidade de Entrada (Últimos 10 minutos)
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
            const [velocityRows] = await db.query(
                `SELECT COUNT(*) as recent_count FROM ${logsTable} WHERE criado_em >= ?`,
                [tenMinsAgo]
            );
            const personsPerMinute = (velocityRows[0].recent_count / 10).toFixed(1);

            // 2. Estado Atual da Ocupação
            const [occupancyRows] = await db.query(
                `SELECT 
                    (SELECT COUNT(*) FROM ${convTable} WHERE status_checkin = 1) as presentes,
                    (SELECT COUNT(*) FROM ${convTable}) as total`
            );
            const { presentes, total } = occupancyRows[0];
            const restantes = total - presentes;

            // 3. Predição de Término (ETA)
            let etaMinutes = null;
            if (parseFloat(personsPerMinute) > 0) {
                etaMinutes = Math.ceil(restantes / parseFloat(personsPerMinute));
            }

            // 4. Detecção de Anomalias de Fluxo (IA Heurística)
            // Se a velocidade for muito baixa em relação à capacidade restante, alerta de gargalo.
            const bottleneckRisk = (parseFloat(personsPerMinute) < (restantes / 60)) && restantes > 50;

            // 5. Histórico da Última Hora (Para Gráfico de Tendência) - Fix #12: HOUR()
            const [trendRows] = await db.query(
                `SELECT 
                    CONCAT(LPAD(HOUR(criado_em), 2, '0'), ':00') as minute, 
                    COUNT(*) as count 
                 FROM ${logsTable} 
                 WHERE criado_em >= DATE_SUB(NOW(), INTERVAL 1 HOUR) 
                 GROUP BY HOUR(criado_em) 
                 ORDER BY HOUR(criado_em) ASC`
            );

            return {
                success: true,
                metrics: {
                    velocity: personsPerMinute,
                    eta_minutes: etaMinutes,
                    occupancy_percent: ((presentes / total) * 100).toFixed(1),
                    remaining: restantes,
                    bottleneckRisk
                },
                trend: trendRows
            };
        } catch (error) {
            Logger.error('Erro no PredictiveService:', error);
            throw error;
        }
    }
};
