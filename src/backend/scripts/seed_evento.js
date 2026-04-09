import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import db, { initEventTables } from '../config/db.js';
import crypto from 'crypto';

async function generateSeed() {
  console.log('🌱 Preparando Evento de Teste Visual...');
  try {
    // 1. Calcular Datas (Ontem, Hoje, Amanhã)
    const td = new Date();
    
    const dOntem = new Date(td); dOntem.setDate(dOntem.getDate() - 1);
    const dAmanha = new Date(td); dAmanha.setDate(dAmanha.getDate() + 1);

    const formatDB = (d) => d.toISOString().split('T')[0];
    const dataInicio = formatDB(dOntem);
    const dataFim = formatDB(dAmanha);

    // 2. Criar Evento
    const [ev] = await db.query(
      `INSERT INTO eventos (nome, data_evento, data_inicio, data_fim, local, cor_primaria, tipo_evento, capacidade_total) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Lollapalooza TESTE (3 Dias)', 'Festival de 3 Dias', dataInicio, dataFim, 'Autódromo de Interlagos', '#ef4444', 'Festival', 1000]
    );
    const eventoId = ev.insertId;
    await initEventTables(eventoId);
    console.log(`✅ Evento #${eventoId} criado: De ${dataInicio} até ${dataFim}.`);

    const convTable = `convidados_ev${eventoId}`;
    const logsTable = `checkin_logs_ev${eventoId}`;

    // 3. Inserir 10 Convidados
    const nomes = ['Ana Silva', 'Bruno Costa', 'Carlos Eduardo', 'Daniela Ruiz', 'Eduardo Bacch', 'Fernanda Lima', 'Gabriel Toledo', 'Helena Souza', 'Igor Santos', 'Julia Vieira'];
    const mockData = nomes.map((nome, i) => [
      nome, 
      `QR_TEST_${i}_${crypto.randomUUID().slice(0,6)}`, 
      i % 2 === 0 ? 'VIP' : 'GERAL', 
      eventoId, 
      `000000000${i}`.slice(-11)
    ]);

    await db.query(`INSERT INTO ${convTable} (nome, qrcode, categoria, evento_id, cpf) VALUES ?`, [mockData]);
    console.log(`✅ 10 Convidados inseridos.`);

    // 4. Pegar IDs inseridos
    const [convidados] = await db.query(`SELECT id, qrcode FROM ${convTable}`);

    // 5. Simular Checkins para exibir os Botões Verdes na UI
    console.log('✅ Simulando check-ins para Teste Visual...');
    
    const logs = [];
    
    // Convidado 1 (Ana Silva) - Veio APENAS no Dia 01 (Ontem)
    const tsOntem = new Date(dOntem);
    tsOntem.setHours(14, 30, 15);
    logs.push([convidados[0].id, eventoId, formatDB(dOntem), '127.0.0.1', 'SYS_SEED', 0, 'APP', tsOntem]);

    // Convidado 2 (Bruno Costa) - Veio no Dia 01 e Dia 02 (Hoje)
    const tsHoje = new Date(td);
    tsHoje.setHours(10, 15, 0);
    logs.push([convidados[1].id, eventoId, formatDB(dOntem), '127.0.0.1', 'SYS_SEED', 0, 'APP', tsOntem]);
    logs.push([convidados[1].id, eventoId, formatDB(td), '127.0.0.1', 'SYS_SEED', 0, 'APP', tsHoje]);

    // Convidado 3 (Carlos Eduardo) - Veio APENAS Hoje (Pulou o Dia 01)
    logs.push([convidados[2].id, eventoId, formatDB(td), '127.0.0.1', 'SYS_SEED', 0, 'APP', tsHoje]);

    // O resto não veio nenhum dia, todos os botões devem estar azuis pra eles.

    // Insere logs com tempo customizado ('criado_em') para simular a Vida Real
    for (const log of logs) {
        await db.query(
            `INSERT INTO ${logsTable} (convidado_id, evento_id, data_ponto, ip, assinatura_hash, is_suspicious, station_id, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            log
        );
    }

    // Setar status_checkin para os que vieram hoje ou ontem (1)
    await db.query(`UPDATE ${convTable} SET status_checkin = 1, data_entrada = NOW() WHERE id IN (1, 2, 3)`);

    console.log('\n🎉 EVENTO DE TESTE PRONTO!');
    console.log(`-> Por favor, abra o Frontend, selecione o evento "Lollapalooza TESTE" (ID: ${eventoId})`);
    console.log(`-> Teste Ana Silva (Apenas botão Dia 01 Verde, o resto Azul)`);
    console.log(`-> Teste Bruno (Dois botões Verdes)`);
    console.log(`-> Teste Carlos (Apenas Botão Dia 02 Verde)`);
    console.log(`-> Pode clicar no botão de EXPORTAR CSV também!`);

  } catch (e) {
    console.error('❌ ERRO:', e.message);
  } finally {
    process.exit(0);
  }
}

generateSeed();
