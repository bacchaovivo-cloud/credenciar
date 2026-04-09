import db from '../config/db.js';

/**
 * SCRIPT DE TESTE DE CARGA - SIMULADOR DE EVENTO (Refatorado para FETCH Nativo)
 * Dispara centenas de check-ins simultâneos para testar a concorrência do banco e a fila de simulação.
 */

const API_URL = 'http://localhost:3001/api';
const EVENTO_ID = 3; 
const TOTAL_CHECKINS = 150;
const CONCORRENCIA = 30; 

async function startLoadTest() {
  console.log('🚀 Iniciando Stress Test (Simulação Local)...');
  
  // 1. Busca QR Codes válidos que ainda não fizeram check-in
  const [convidados] = await db.query(
    'SELECT qrcode FROM convidados WHERE evento_id = ? AND status_checkin = 0 LIMIT ?',
    [EVENTO_ID, TOTAL_CHECKINS]
  );

  if (convidados.length === 0) {
    console.error('❌ Nenhum convidado pendente encontrado para o Evento 3.');
    process.exit(1);
  }

  console.log(`📋 Encontrados ${convidados.length} convidados para o teste.`);

  // 1. Login Manual via Fetch
  let token = '';
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'stress_test', senha: 'stress123' })
    });
    const data = await response.json();
    token = data.token;
    if (!token) throw new Error(`Falha no login: ${data.message || 'Sem token'}`);
    console.log('🔑 Login OK.');
  } catch (err) {
    console.error('❌ Erro de Login:', err.message);
    process.exit(1);
  }

  let stats = { sucesso: 0, duplicado: 0, erro: 0 };
  const start = Date.now();

  console.log(`⚡ Disparando ${TOTAL_CHECKINS} check-ins...`);

  for (let i = 0; i < convidados.length; i += CONCORRENCIA) {
    const chunk = convidados.slice(i, i + CONCORRENCIA);
    
    await Promise.all(chunk.map(async (c) => {
      try {
        const res = await fetch(`${API_URL}/impressao/credenciar`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            qrcode: c.qrcode,
            evento_id: EVENTO_ID,
            station_id: `Stress-PC-${Math.floor(Math.random() * 5)}`, // Simula 5 estações
            printer_ip: '99.99.0.1', // Modo Fake
            printer_port: 9100
          })
        });

        if (res.status === 200) stats.sucesso++;
        else if (res.status === 409) stats.duplicado++;
        else stats.erro++;
      } catch (err) {
        stats.erro++;
      }
    }));
    
    process.stdout.write(`Progresso: ${Math.round((i / convidados.length) * 100)}%\r`);
  }

  const duration = (Date.now() - start) / 1000;
  
  console.log('\n\n====================================');
  console.log(`📊 RESULTADOS DO TESTE DE CARGA`);
  console.log(`⏱️ Tempo Total: ${duration.toFixed(2)}s`);
  console.log(`✅ Sucessos: ${stats.sucesso}`);
  console.log(`⚠️ Duplicados Bloqueados: ${stats.duplicado}`);
  console.log(`❌ Erros Técnicos: ${stats.erro}`);
  console.log('====================================\n');
  
  // Verifica se os workers estão imprimindo as simulações
  const [fila] = await db.query('SELECT COUNT(*) as qtd FROM print_jobs WHERE status = "PENDENTE"');
  console.log(`📦 Status Final da Fila: ${fila[0].qtd} jobs aguardando processamento simultâneo.`);
  
  process.exit(0);
}

startLoadTest();
