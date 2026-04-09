import fetch from 'node-fetch';

async function testManualCheckin() {
  const url = 'http://localhost:3001/api/impressao/credenciar';
  const payload = {
    qrcode: 'QR_TEST_0_f7d6c4', // Ana Silva
    evento_id: 12,
    data_ponto: '2026-04-10', // Dia 3
    station_id: 'TEST_SCRIPT'
  };

  console.log('🚀 Enviando Teste de Check-in Manual (Dia 3)...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('✅ Resposta do Servidor:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('❌ Erro:', e.message);
  }
}

testManualCheckin();
