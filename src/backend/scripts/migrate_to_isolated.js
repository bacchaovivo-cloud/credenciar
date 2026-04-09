import 'dotenv/config';
import db, { initEventTables } from '../config/db.js';

/**
 * SCRIPT DE MIGRAÇÃO: Mover dados da tabela central para tabelas isoladas por evento.
 */
async function migrate() {
  console.log("🚀 Iniciando Migração para Arquitetura Isolada...");

  try {
    // 1. Obter todos os eventos
    const [eventos] = await db.query('SELECT id, nome FROM eventos');
    console.log(`📡 Encontrados ${eventos.length} eventos.`);

    for (const evento of eventos) {
      console.log(`\n📦 Processando Evento: ${evento.nome} (ID: ${evento.id})`);
      
      // Criar as tabelas se não existirem
      const { convTable, logsTable } = await initEventTables(evento.id);

      // 2. Mover Convidados (Campos compatíveis)
      const [convMoves] = await db.query(`
        INSERT IGNORE INTO ${convTable} 
        (id, evento_id, nome, cpf, telefone, categoria, qrcode, status_checkin, data_entrada, cargo, empresa, face_descriptor)
        SELECT id, evento_id, nome, cpf, telefone, categoria, qrcode, status_checkin, data_entrada, cargo, empresa, face_descriptor 
        FROM convidados WHERE evento_id = ?
      `, [evento.id]);
      console.log(`✅ ${convMoves.affectedRows} convidados movidos.`);

      // 3. Mover Checkins
      const [logMoves] = await db.query(`
        INSERT IGNORE INTO ${logsTable} 
        (id, convidado_id, evento_id, usuario_id, data_ponto, station_id, assinatura_hash, ip, is_suspicious, checkin_photo, criado_em)
        SELECT id, convidado_id, evento_id, usuario_id, data_ponto, station_id, assinatura_hash, ip, is_suspicious, checkin_photo, criado_em 
        FROM checkin_logs WHERE evento_id = ?
      `, [evento.id]);
      console.log(`✅ ${logMoves.affectedRows} logs de check-in movidos.`);
    }

    console.log("\n✨ Migração concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("🔥 FALHA CRÍTICA NA MIGRAÇÃO:", error);
    process.exit(1);
  }
}

migrate();
