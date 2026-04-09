import db, { getEventTablesList } from '../config/db.js';
import { CacheService } from './cacheService.js';
import pLimit from 'p-limit';

/**
 * 📊 STATS SERVICE (Enterprise Analytics)
 * Motor de agregação de dados e performance para dashboards.
 */
export class StatsService {

  // Fix: Paralela com p-limit(8) — evita esgotar o pool MySQL (connectionLimit: 10) com muitos eventos simultâneos
  static async getDashboardGeral() {
    const cacheKey = 'stats_dashboard_geral';
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;

    const [eventosRows] = await db.query('SELECT id FROM eventos');
    const limit = pLimit(8); // Abaixo do connectionLimit: 10

    const stats = await Promise.all(
      eventosRows.map(ev => limit(async () => {
        const { convTable } = getEventTablesList(ev.id);
        try {
          const [[c]] = await db.query(
            `SELECT COUNT(*) as total, SUM(status_checkin) as presentes FROM ${convTable}`
          );
          return { total: c.total || 0, presentes: parseInt(c.presentes) || 0 };
        } catch { return { total: 0, presentes: 0 }; }
      }))
    );

    const totalConvidados = stats.reduce((a, s) => a + s.total, 0);
    const totalCheckins = stats.reduce((a, s) => a + s.presentes, 0);

    const result = {
      eventos: eventosRows.length,
      participantes: totalConvidados,
      checkins: totalCheckins,
      lastUpdated: new Date()
    };

    CacheService.set(cacheKey, result, 60000);
    return result;
  }

  // Fix #10: Cache de 30s para evitar 6 queries em cascata a cada dashboard refresh
  static async getStatsEvento(eventoId) {
    const evID = parseInt(eventoId);
    const cacheKey = `stats_evento_${evID}`;
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;

    const { convTable, logsTable } = getEventTablesList(evID);
    
    // Agregação de Categorias (Lotação por Setor)
    const [categorias] = await db.query(
      `SELECT categoria as name, COUNT(*) as total, SUM(status_checkin) as presentes FROM ${convTable} GROUP BY categoria`
    );

    // Fluxo por Hora (Performance) - Fix #12: HOUR() é mais eficiente
    const [fluxos] = await db.query(
      `SELECT HOUR(criado_em) as hora, COUNT(*) as qtd FROM ${logsTable} GROUP BY HOUR(criado_em) ORDER BY HOUR(criado_em)`
    );
    const fluxo = fluxos.map(f => ({ hora: `${String(f.hora).padStart(2, '0')}:00`, qtd: f.qtd }));

    // Últimos Check-ins (Feed Real-time)
    const [ultimos] = await db.query(
      `SELECT c.id, c.nome, c.categoria, l.criado_em as data_entrada 
       FROM ${logsTable} l
       JOIN ${convTable} c ON l.convidado_id = c.id
       ORDER BY l.criado_em DESC LIMIT 10`
    );

    // Anomalias Forenses Recentes
    const [anomalias] = await db.query(
      `SELECT l.id, c.nome as convidado_nome, c.categoria, l.is_suspicious 
       FROM ${logsTable} l
       JOIN ${convTable} c ON l.convidado_id = c.id
       WHERE l.is_suspicious = 1 ORDER BY l.criado_em DESC LIMIT 5`
    );

    const result = {
      categorias,
      grafico: fluxo.map(f => ({ hora: `${f.hora}h`, qtd: f.qtd })),
      ultimos,
      anomaliasRecentes: anomalias,
      ...await this.getPrevisoes(evID, convTable, logsTable),
      comparativo: await this.getComparativoMultiDia(evID, logsTable)
    };

    CacheService.set(cacheKey, result, 30000); // 30s de cache
    return result;
  }

  static async getComparativoMultiDia(eventoId, logsTable) {
    // Busca fluxo de check-in agrupado por DIA e HORA
    const [rows] = await db.query(
      `SELECT data_ponto, HOUR(criado_em) as hora, COUNT(*) as qtd 
       FROM ${logsTable} 
       GROUP BY data_ponto, HOUR(criado_em) 
       ORDER BY data_ponto, hora`
    );

    // Organiza os dados para o Recharts (formato: [{ hora: '00h', '2023-01-01': 10, '2023-01-02': 15 }, ...])
    const dataMap = {};
    const diasSet = new Set();

    rows.forEach(r => {
      const h = `${String(r.hora).padStart(2, '0')}h`;
      const d = r.data_ponto;
      diasSet.add(d);
      if (!dataMap[h]) dataMap[h] = { hora: h };
      dataMap[h][d] = r.qtd;
    });

    return {
      dados: Object.values(dataMap).sort((a, b) => a.hora.localeCompare(b.hora)),
      dias: Array.from(diasSet).sort()
    };
  }

  static async getPrevisoes(eventoId, convTable, logsTable) {
    // [IA-FORECASTING] Lógica de Velocidade e ETA
    const [velocidadeRecente] = await db.query(
      `SELECT COUNT(*) as qtd FROM ${logsTable} WHERE criado_em >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
    );
    
    const [counts] = await db.query(
      `SELECT COUNT(*) as total, SUM(status_checkin) as presentes FROM ${convTable}`
    );

    const v_req_min = (velocidadeRecente[0].qtd || 0) / 15;
    const faltantes = (counts[0].total || 0) - (parseInt(counts[0].presentes) || 0);
    const eta_minutos = v_req_min > 0 ? Math.round(faltantes / v_req_min) : null;

    return {
      total: counts[0].total || 0,
      presentes: parseInt(counts[0].presentes) || 0,
      ausentes: faltantes,
      velocidadeAtual: Math.round(v_req_min * 60),
      previsaoLotacao: eta_minutos,
      isGargalo: v_req_min > 0 && v_req_min < 0.5 && faltantes > 50
    };
  }

  static async getProdutividade(eventoId, logsTable) {
    const [produtividade] = await db.query(
      `SELECT IFNULL(station_id, 'Terminal Principal') as station, COUNT(*) as qtd 
       FROM ${logsTable} GROUP BY station_id ORDER BY qtd DESC`
    );
    return produtividade;
  }

  // Fix: Cache de 30s adicionado (estava sem cache — N queries a cada requisição)
  static async getStatsConsolidado() {
    const cacheKey = 'stats_consolidado';
    const cached = CacheService.get(cacheKey);
    if (cached) return cached;

    const [eventos] = await db.query('SELECT id, nome, cor_primaria FROM eventos');

    const logsConsolidados = await Promise.all(
      eventos.map(async ev => {
        const { convTable } = getEventTablesList(ev.id);
        try {
          const [stats] = await db.query(
            `SELECT COUNT(*) as inscritos, SUM(status_checkin) as presentes FROM ${convTable}`
          );
          return {
            id: ev.id,
            nome: ev.nome,
            cor: ev.cor_primaria,
            inscritos: stats[0].inscritos || 0,
            presentes: stats[0].presentes || 0
          };
        } catch { return null; }
      })
    ).then(r => r.filter(Boolean));

    CacheService.set(cacheKey, logsConsolidados, 30000);
    return logsConsolidados;
  }
}
