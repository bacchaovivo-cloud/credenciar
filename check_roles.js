import db from './src/backend/config/db.js';

async function checkUsers() {
  try {
    const [rows] = await db.query('SELECT id, nome, usuario, role FROM usuarios');
    console.log('USUARIOS_DATA_START');
    console.log(JSON.stringify(rows, null, 2));
    console.log('USUARIOS_DATA_END');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao acessar banco:', err.message);
    process.exit(1);
  }
}

checkUsers();
