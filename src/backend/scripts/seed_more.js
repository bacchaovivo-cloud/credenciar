import db from '../config/db.js';

async function seedBig() {
  const eventId = 3; 
  console.log('🌱 Gerando 500 convidados para o teste de Backpressure...');
  
  const values = [];
  for (let i = 1000; i < 1500; i++) {
    values.push([`Convidado Stress ${i}`, `QR-STRESS-${i}`, 'GERAL', eventId, 0]);
  }

  await db.query('INSERT INTO convidados (nome, qrcode, categoria, evento_id, status_checkin) VALUES ?', [values]);
  
  console.log('✅ 500 Convidados extras carregados!');
  process.exit(0);
}

seedBig().catch(err => { console.error(err); process.exit(1); });
