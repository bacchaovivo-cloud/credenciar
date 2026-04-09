import db from '../config/db.js';

/**
 * SCRIPT DE TESTE DE BACKPRESSURE (Fluxo Contínuo)
 * Simula a chegada de 500 participantes em um intervalo de 3 a 5 minutos.
 * Permite observar o crescimento da fila física e a recuperação dos workers.
 */

const API_URL = 'http://localhost:3001/api';
const EVENTO_ID = 3; 
const TOTAL_GUESTS = 300; // Reduzido para 300 para um teste controlado de 5 min
const RATE_PER_SECOND = 1; // 1 pessoa por segundo (Simulando uma portaria constante)

async function startBackpressureTest() {
  console.log('🚀 Iniciando Teste de Backpressure (Fluxo Realista)...');
  console.log(`⏱️ Alvo: ${TOTAL_GUESTS} bips a 1/segundo (~5 minutos de teste)`);

  const [convidados] = await db.query(
    'SELECT qrcode FROM convidados WHERE evento_id = ? AND status_checkin = 0 LIMIT ?',
    [EVENTO_ID, TOTAL_GUESTS]
  );

  if (convidados.length < TOTAL_GUESTS) {
    console.error(`❌ Necessário pelo menos ${TOTAL_GUESTS} convidados pendentes no Evento 3.`);
    process.exit(1);
  }

  // Login
  const loginRes = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'stress_test', senha: 'stress123' })
  });
  const { token } = await loginRes.json();

  let successCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < convidados.length; i++) {
    const c = convidados[i];
    
    // Dispara o bip sem esperar finalizar (Assíncrono)
    fetch(`${API_URL}/impressao/credenciar`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        qrcode: c.qrcode,
        evento_id: EVENTO_ID,
        station_id: `Portaria-Real-${(i % 3) + 1}`, // Simula 3 portões
        printer_ip: '99.99.0.1', 
        printer_port: 9100
      })
    }).then(res => {
      if (res.status === 200) successCount++;
    });

    if (i % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`📡 Bips enviados: ${i}/${TOTAL_GUESTS} | Sucessos API: ${successCount} | Tempo: ${elapsed.toFixed(1)}s`);
    }

    // Delay de 1 segundo entre cada bip (Fluxo de portaria)
    await new Promise(r => setTimeout(r, 1000 / RATE_PER_SECOND));
  }

  console.log('\n✅ Todos os bips enviados. Aguardando workers esvaziarem a fila...');
  
  // Monitoramento final
  const monitor = setInterval(async () => {
    const [fila] = await db.query('SELECT COUNT(*) as qtd FROM print_jobs WHERE status = "PENDENTE" OR status = "PROCESSANDO"');
    console.log(`📦 Status da Fila Física: ${fila[0].qtd} etiquetas pendentes.`);
    if (fila[0].qtd === 0) {
      console.log('🏁 Fila esgotada!');
      clearInterval(monitor);
      process.exit(0);
    }
  }, 5000);
}

startBackpressureTest().catch(console.error);
