import db from '../config/db.js';
import bcrypt from 'bcrypt';

async function setup() {
  console.log('👷 Configurando usuário de teste...');
  
  // Deleta se já existir
  await db.query('DELETE FROM usuarios WHERE usuario = "stress_test"');
  
  // 🔐 HARDENING: Sempre hashear senhas antes de inserir no banco, mesmo em scripts de teste.
  // Evita backdoors em texto plano se o script for executado por engano em produção.
  const hash = await bcrypt.hash('stress123', 10);

  await db.query(
    'INSERT INTO usuarios (nome, usuario, senha, role) VALUES (?, ?, ?, ?)',
    ['Stress Test Admin', 'stress_test', hash, 'ADMIN']
  );
  
  console.log('✅ Usuário "stress_test" / "stress123" criado (Hashed)!');
  process.exit(0);
}

setup().catch(err => { console.error(err); process.exit(1); });
