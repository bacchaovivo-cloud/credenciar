import mysql from 'mysql2/promise';
import 'dotenv/config';

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

const [rows] = await db.query('SELECT * FROM usuarios WHERE usuario = "admin"');
console.log(rows);
await db.end();
