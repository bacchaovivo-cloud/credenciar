import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' }); // Carrega as envs se tiver
import db, { initEventTables } from '../config/db.js';
import { CheckinService } from '../services/checkinService.js';
import crypto from 'crypto';

async function runLoadTest() {
  console.log('🚀 INICIANDO TESTE DE ESTRESSE: EVENTO MULTI-DIA (5.000 PARTICIPANTES)');
  try {
    // 1. Criando Evento Fantasma
    console.log('\n[1/4] Criando Evento de Teste...');
    const startTime = Date.now();
    const [result] = await db.query(
      `INSERT INTO eventos (nome, data_evento, data_inicio, data_fim, local, cor_primaria, tipo_evento, capacidade_total) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['MEGA TESTE STRESS - 5K GUESTS', 'Vários Dias', '2026-05-10', '2026-05-12', 'Laboratório Zenith', '#ef4444', 'Festival', 5000]
    );
    const eventoId = result.insertId;
    await initEventTables(eventoId);
    console.log(`✅ Evento #${eventoId} Criado. Tabelas Isoladas Prontas (${Date.now() - startTime}ms)`);

    const convTable = `convidados_ev${eventoId}`;
    const logsTable = `checkin_logs_ev${eventoId}`;

    // 2. Simulando Bulk Insert Máximo (5.000 participantes de uma vez)
    console.log('\n[2/4] Gerando Mock de 5.000 Participantes...');
    const participantesGenStartTime = Date.now();
    const mockData = Array.from({ length: 5000 }).map((_, i) => [
      `Teste Convidado ${i + 1}`,
      `BACCH_${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`,
      ['VIP', 'GERAL', 'STAFF'][Math.floor(Math.random() * 3)],
      eventoId,
      `000000${String(i).padStart(5, '0')}`, // Fake CPF
    ]);
    console.log(`✅ Array de 5k montado em Memória (${Date.now() - participantesGenStartTime}ms)`);

    console.log('\n[3/4] Bombardeando MySQL com Bulk Insert massivo...');
    const bulkInsertStartTime = Date.now();
    await db.query(
      `INSERT INTO ${convTable} (nome, qrcode, categoria, evento_id, cpf) VALUES ?`,
      [mockData]
    );
    const timeTakedDB = Date.now() - bulkInsertStartTime;
    console.log(`✅ 5.000 Inserções realizadas em uma pancada no MySQL: ${timeTakedDB}ms (Impressionante!)`);

    // 3. Simulando Processamento de Check-in em Múltiplos Dias (Dia 1 e Dia 2)
    console.log('\n[4/4] Simulando fluxo intenso de Check-in Multi-dia...');

    // Fetch todos os QRCodes
    const [qrs] = await db.query(`SELECT id, qrcode FROM ${convTable}`);

    // Simula Check-in DIA 1 (Vamos usar raw SQL apenas para simular a Data do BD porque o Service sempre puxa do clock atual do SO)
    console.log('    -> Simulando Check-in de TODOS (5.000 pessoas) no DIA 1...');
    const checkinDia1Start = Date.now();
    // Preparando bulk log
    const dataDia1 = '2026-05-10';
    const logsDia1 = qrs.map(q => [q.id, eventoId, dataDia1, '127.0.0.1', 'SYS_TEST', 0, 'PORTARIA_DIA1']);
    
    await db.query(
      `INSERT INTO ${logsTable} (convidado_id, evento_id, data_ponto, ip, assinatura_hash, is_suspicious, station_id) VALUES ?`,
      [logsDia1]
    );
    await db.query(`UPDATE ${convTable} SET status_checkin = 1, data_entrada = NOW()`);
    console.log(`✅ 5.000 Check-ins DIA 1 gravados: ${Date.now() - checkinDia1Start}ms`);

    // Vamos testar o CheckinService REAL no Dia Atual (Simulando Dia 2) para alguns VIPs de teste
    console.log('    -> Testando Lógica Nativa Anti-Duplicidade (Dia Corrente vs Dias Diferentes)...');
    
    // Tenta checar pelo Serviço de Checkin oficial (Mesmo dia hoje causaria block)
    const probeC1 = qrs[0];
    try {
        await CheckinService.processarCheckin({
            qrcode: probeC1.qrcode,
            evento_id: eventoId,
            ip: '127.0.0.1',
            station_id: 'PORTA_TESTE'
        });
        console.log(`    🟢 Sucesso Check-in Pelo Service (Processado Hoje!)`);
        
        // Tenta pela segunda vez hoje para dar DUPLICIDADE
        try {
            await CheckinService.processarCheckin({
                qrcode: probeC1.qrcode,
                evento_id: eventoId,
                ip: '127.0.0.1',
                station_id: 'PORTA_TESTE'
            });
            console.log(`    ❌ FALHA NATIVA! Deveria bloquear duplicidade hoje.`);
        } catch (e) {
            console.log(`    🟢 Double-Check: Lógica anti-dupla validada corretamente para hoje: "${e.message}"`);
        }

    } catch (e) {
        console.log(`    ❌ CHECKIN NATIVO quebrou:`, e.message);
    }
    
    console.log('\n🎉 TESTE DE ESTRESSE CONCLUÍDO!');
    
    // Deleta o evento para não sujar o DB
    await db.query('DELETE FROM eventos WHERE id = ?', [eventoId]);
    console.log('🧹 Limpeza do evento de teste finalizada.');

  } catch (err) {
    console.error('❌ ERRO CRÍTICO DURANTE TESTE DE CARGA:', err);
  } finally {
    process.exit(0);
  }
}

runLoadTest();
