import db, { initEventTables, registrarLog } from '../config/db.js';
import { Logger } from '../utils/logger.js';
import { CacheService } from './cacheService.js';

/**
 * 🏗️ EVENTO SERVICE (Enterprise Logic)
 * Abstração de regras de negócio para gestão de eventos e temas dinâmicos.
 */
export class EventoService {
  
  // Fix #4 e Totais: Seleciona as colunas necessárias e busca dados dinâmicos das tabelas isoladas
  static async listarTodos() {
    const [rows] = await db.query(
      'SELECT id, nome, data_evento, data_inicio, data_fim, local, cor_primaria, tipo_evento, capacidade_total, logo_url, background_url FROM eventos ORDER BY id DESC'
    );
    
    // Preenche as estatísticas para os cards (Dashboard / Eventos)
    const eventosComStats = await Promise.all(
      rows.map(async (ev) => {
        try {
          const { convTable } = initEventTables ? { convTable: `convidados_ev${ev.id}` } : getEventTablesList(ev.id); // Shortcut fallback
          const [counts] = await db.query(`SELECT COUNT(*) as inscritos, SUM(status_checkin) as presentes FROM ${convTable}`);
          return {
            ...ev,
            total_convidados: counts[0]?.inscritos || 0,
            total_checkins: parseInt(counts[0]?.presentes) || 0
          };
        } catch (err) {
          // Em caso de primeira carga onde as tabelas possivelmente falhem
          return { ...ev, total_convidados: 0, total_checkins: 0 };
        }
      })
    );
    return eventosComStats;
  }

  static async buscarPorId(id) {
    const [rows] = await db.query('SELECT * FROM eventos WHERE id = ?', [id]);
    if (rows.length === 0) throw new Error('Evento não encontrado');
    return rows[0];
  }

  static async criar(dados) {
    const allowedFields = [
      'nome', 'data_evento', 'data_inicio', 'data_fim', 'local',
      'descricao', 'capacidade_total', 'cor_primaria', 'tipo_evento',
      'printer_ip', 'printer_port'
    ];
    
    const columns = [];
    const values = [];
    
    for (const field of allowedFields) {
      if (dados[field] !== undefined) {
        columns.push(field);
        values.push(dados[field] ?? null);
      }
    }
    
    // Garantir defaults obrigatórios se não fornecidos
    if (!columns.includes('cor_primaria')) { columns.push('cor_primaria'); values.push('#0ea5e9'); }
    if (!columns.includes('tipo_evento')) { columns.push('tipo_evento'); values.push('Evento'); }
    if (!columns.includes('nome')) throw new Error('Nome do evento é obrigatório');
    
    const placeholders = columns.map(() => '?').join(', ');
    const [result] = await db.query(
      `INSERT INTO eventos (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    const newId = result.insertId;
    
    // Cria tabelas isoladas para o novo evento
    await initEventTables(newId);
    
    Logger.info(`Evento Criado: ${dados.nome} (ID: ${newId})`);
    // Fix evolução: registra no log forense (criação de evento antes não era auditada)
    await registrarLog(null, 'EVENTO_CRIADO', `Evento: ${newId} | Nome: ${dados.nome} | Tipo: ${dados.tipo_evento || 'Evento'}`, null);
    return { id: newId, ...dados };
  }

  // Fix #21: Todos os campos editáveis do evento inclusos
  static async atualizar(id, dados) {
    const allowedFields = [
      'nome', 'data_evento', 'data_inicio', 'data_fim', 'local',
      'descricao', 'capacidade_total', 'cor_primaria', 'tipo_evento',
      'printer_ip', 'printer_port', 'config_totem',
      'label_template_json', 'whatsapp_enabled', 'whatsapp_template'
    ];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (dados[field] !== undefined) {
        updates.push(`${field} = ?`);
        const jsonFields = ['config_totem', 'label_template_json'];
        values.push(jsonFields.includes(field) ? JSON.stringify(dados[field]) : dados[field]);
      }
    }

    if (updates.length > 0) {
      values.push(id);
      await db.query(`UPDATE eventos SET ${updates.join(', ')} WHERE id = ?`, values);
      CacheService.delete(`evento_${id}`); // Invalida cache
    }

    return { id, ...dados };
  }

  static async excluir(id) {
    const [ev] = await db.query('SELECT nome FROM eventos WHERE id = ?', [id]);
    if (ev.length === 0) throw new Error('Evento não encontrado');

    // As tabelas isoladas NÃO são removidas por segurança forense (Políticas de Retenção)
    await db.query('DELETE FROM eventos WHERE id = ?', [id]);
    Logger.warn(`Evento EXCLUÍDO: ${ev[0].nome} (ID: ${id})`);
    return { success: true };
  }
}
