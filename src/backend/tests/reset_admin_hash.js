import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const hash = await bcrypt.hash('admin', 10);
const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

await db.query('UPDATE usuarios SET senha=? WHERE usuario="admin"', [hash]);
console.log('✅ Admin password hash updated for "admin"');
await db.end();
