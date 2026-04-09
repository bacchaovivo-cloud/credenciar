import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import db, { getEventTablesList } from '../config/db.js';
import { CheckinService } from '../services/checkinService.js';
import crypto from 'crypto';

async function testDuplicidade() {
  console.log('🧪 Iniciando teste de duplicidade');
  const evento_id = 11;
  const { convTable, logsTable } = getEventTablesList(evento_id);

  // Criar evento de teste temporário
  await db.query(`INSERT IGNORE INTO eventos (id, nome) VALUES (?, ?)`, [11, 'EV TESTE DUP']);
  await db.query(`CREATE TABLE IF NOT EXISTS ${convTable} LIKE convidados_ev1`);
  await db.query(`CREATE TABLE IF NOT EXISTS ${logsTable} LIKE checkin_logs_ev1`);
  
  // Limpa os dados desse evento de teste
  await db.query(`TRUNCATE TABLE ${convTable}`);
  await db.query(`TRUNCATE TABLE ${logsTable}`);

  const qr = `QR_${Date.now()}`;
  await db.query(`INSERT INTO ${convTable} (nome, qrcode, categoria, evento_id) VALUES ('Teste Duplo', ?, 'TEST', ?)`, [qr, evento_id]);

  console.log('\n⏳ Tentativa 1 (Normal) para o Dia 1 (2026-05-10)...');
  try {
     const res1 = await CheckinService.processarCheckin({
         qrcode: qr, evento_id, ip: '127', data_ponto: '2026-05-10'
     });
     console.log('✔ Sucesso. ', res1.success);
  } catch (e) {
     console.log('❌ Erro inesperado 1:', e.message);
  }

  console.log('\n⏳ Tentativa 2 (Duplicidade no mesmo milissegundo) -> Idempotência...');
  try {
    const res2 = await CheckinService.processarCheckin({
        qrcode: qr, evento_id, ip: '127', data_ponto: '2026-05-10'
    });
    console.log('✔ Retornou Idempotência? ', res2.success);
  } catch(e) {
    console.log('❌ Erro inesperado 2:', e.message);
  }

  // Esperar 15s seria ideal para expirar o cache e testar o bloqueio NATIVO DB, mas limparemos o cache
  const { CacheService } = await import('../services/cacheService.js');
  CacheService.delete(`checkin_${qr}_${evento_id}_2026-05-10`);

  console.log('\n⏳ Tentativa 3 (Duplicidade após tempo, batendo no DB)...');
  try {
    const res3 = await CheckinService.processarCheckin({
        qrcode: qr, evento_id, ip: '127', data_ponto: '2026-05-10'
    });
    console.log('❌ DEIXOU PASSAR DUPLICADO! (Bug?)', res3);
  } catch (e) {
    console.log('✔ Sistema bloqueou corretamente a nível de BD e lançou erro:', e.message);
  }

  // Consultar logs gerados
  const [logs] = await db.query(`SELECT convidado_id, data_ponto FROM ${logsTable}`);
  console.log('\n📋 Registros no BD (Logs):', logs);

  // Testar dia 2
  console.log('\n⏳ Tentativa 4 (Dia Diferente: 2026-05-11)...');
  try {
     const res4 = await CheckinService.processarCheckin({
        qrcode: qr, evento_id, ip: '127', data_ponto: '2026-05-11'
     });
     console.log('✔ Deixou fazer o Dia 2? ', res4.success);
  } catch (e) {
     console.log('❌ Erro inesperado ao tentar Dia 2:', e.message);
  }

  const [logs2] = await db.query(`SELECT convidado_id, data_ponto FROM ${logsTable}`);
  console.log('\n📋 Registros Finais (Logs):', logs2);
  
  process.exit();
}

testDuplicidade();
