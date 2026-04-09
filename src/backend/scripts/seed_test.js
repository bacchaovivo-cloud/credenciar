import db from '../config/db.js';

async function seed() {
  const eventId = 3; 
  console.log('🌱 Gerando 150 convidados para o teste...');
  
  const values = [];
  for (let i = 0; i < 150; i++) {
    values.push([`Teste Concorrente ${i}`, `QR-STRESS-${i}`, 'GERAL', eventId, 0]);
  }

  await db.query('INSERT INTO convidados (nome, qrcode, categoria, evento_id, status_checkin) VALUES ?', [values]);
  
  console.log('✅ 150 Convidados Fakes prontos para o Stress Test!');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Erro no seed:', err.message); process.exit(1); });
