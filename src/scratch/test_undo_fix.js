
import db from '../backend/config/db.js';

async function testUndo() {
    try {
        const id = 4; // Daniela Ruiz
        const data_ponto = '2026-04-08';
        const logsTable = 'checkin_logs_ev12';

        console.log(`Auditing logs for guest ${id}...`);
        const [logsBefore] = await db.query(`SELECT * FROM ${logsTable} WHERE convidado_id = ?`, [id]);
        console.log("Before:", logsBefore.map(l => l.data_ponto));

        console.log(`Running DELETE: WHERE convidado_id = ${id} AND DATE(data_ponto) = DATE('${data_ponto}')`);
        const [res] = await db.query(`DELETE FROM ${logsTable} WHERE convidado_id = ? AND DATE(data_ponto) = DATE(?)`, [id, data_ponto]);
        console.log("Result:", res.affectedRows, "rows deleted");

        const [logsAfter] = await db.query(`SELECT * FROM ${logsTable} WHERE convidado_id = ?`, [id]);
        console.log("After:", logsAfter.map(l => l.data_ponto));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

testUndo();
