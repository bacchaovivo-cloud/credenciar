
import db from '../backend/config/db.js';

async function audit() {
    try {
        console.log("--- AUDIT EVENTO 12 ---");
        const [ev12] = await db.query('SELECT id, nome, data_inicio FROM eventos WHERE id = 12');
        console.log("Evento 12:", JSON.stringify(ev12[0]));

        const [logs12] = await db.query('SELECT id, convidado_id, data_ponto, DATE(data_ponto) as data_pura FROM checkin_logs_ev12 LIMIT 5');
        console.log("Logs 12:", JSON.stringify(logs12));

        console.log("\n--- AUDIT EVENTO 10 ---");
        const [ev10] = await db.query('SELECT id, nome, data_inicio FROM eventos WHERE id = 10');
        console.log("Evento 10:", JSON.stringify(ev10[0]));

        const [logs10] = await db.query('SELECT id, convidado_id, data_ponto, DATE(data_ponto) as data_pura FROM checkin_logs_ev10 LIMIT 5');
        console.log("Logs 10:", JSON.stringify(logs10));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

audit();
