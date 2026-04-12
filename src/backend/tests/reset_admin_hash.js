import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import 'dotenv/config';

// 🔐 SECURITY HARDENING: Senha não deve ser hardcoded no script.
// Pega a senha do argumento de linha de comando: node script.js <nova_senha>
const novaSenha = process.argv[2];

if (!novaSenha || novaSenha.length < 8) {
    console.error('❌ ERRO: Senha obrigatória não fornecida ou muito curta (min 8 chars).');
    console.error('Uso: node src/backend/tests/reset_admin_hash.js <sua_nova_senha>');
    process.exit(1);
}

const hash = await bcrypt.hash(novaSenha, 10);
const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

await db.query('UPDATE usuarios SET senha=? WHERE usuario="admin"', [hash]);
console.log('✅ Admin password hash updated for "admin"');
await db.end();
