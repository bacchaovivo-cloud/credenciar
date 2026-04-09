import db from '../config/db.js';

async function setup() {
  console.log('👷 Configurando usuário de teste...');
  
  // Deleta se já existir
  await db.query('DELETE FROM usuarios WHERE usuario = "stress_test"');
  
  // Insere um usuário com senha em texto plano (o controller vai hashear no primeiro login)
  await db.query(
    'INSERT INTO usuarios (nome, usuario, senha, role) VALUES (?, ?, ?, ?)',
    ['Stress Test Admin', 'stress_test', 'stress123', 'ADMIN']
  );
  
  console.log('✅ Usuário "stress_test" / "stress123" criado!');
  process.exit(0);
}

setup().catch(err => { console.error(err); process.exit(1); });
