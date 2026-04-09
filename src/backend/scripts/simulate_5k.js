import crypto from 'crypto';
import db, { initEventTables } from '../config/db.js';

/**
 * ZENITH MEGA EVENT SIMULATOR
 * Cria um evento completo com 5000 convidados e simula check-ins realistas.
 */

const TOTAL_GUESTS = 5000;
const TOTAL_CHECKINS = 3800; // Simular 3800 presentes
const CATEGORIAS = ['VIP', 'PISTA', 'CAMAROTE', 'STAFF'];

function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function runSimulator() {
    console.log(`\n🔥 [ZENITH SIMULATOR] INICIANDO PREPARAÇÃO DE MEGA EVENTO 🔥\n`);
    const startTime = Date.now();

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        // 1. Criar Evento
        console.log('📌 1. Criando Evento "Mega Festival Zenith 5K"...');
        const [evRes] = await conn.query(
            `INSERT INTO eventos (nome, tipo_evento, capacidade_total, local) VALUES (?, ?, ?, ?)`,
            ['Mega Festival Zenith 5K', 'Festival', TOTAL_GUESTS, 'Zenith Arena São Paulo']
        );
        const eventoId = evRes.insertId;

        // 2. Inicializar Tabelas Isoladas
        console.log(`📌 2. Criando Data Lake isolado para o Evento ${eventoId}...`);
        const { convTable, logsTable } = await initEventTables(eventoId);

        // 3. Gerar 5000 Convidados na memória
        console.log(`📌 3. Gerando ${TOTAL_GUESTS} convidados sintéticos (Isso pode levar alguns segundos)...`);
        
        // Vamos usar bulk insert em lotes de 1000
        const guests = [];
        for (let i = 0; i < TOTAL_GUESTS; i++) {
            const cat = CATEGORIAS[Math.floor(Math.random() * CATEGORIAS.length)];
            const qrcode = `BACCH_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            guests.push([eventoId, `Convidado VIP ${i+1}`, cat, qrcode]);
        }

        const batchSize = 1000;
        for (let i = 0; i < TOTAL_GUESTS; i += batchSize) {
            const batch = guests.slice(i, i + batchSize);
            await conn.query(
                `INSERT INTO ${convTable} (evento_id, nome, categoria, qrcode) VALUES ?`,
                [batch]
            );
        }

        // 4. Buscar IDs inseridos
        console.log(`📌 4. Simulando entrada de ${TOTAL_CHECKINS} presentes espalhados pelas últimas 4 horas...`);
        const [insertedGuests] = await conn.query(`SELECT id, qrcode FROM ${convTable}`);
        
        // Embaralha para simular ordem aleatória
        const shuffled = insertedGuests.sort(() => 0.5 - Math.random());
        const presentes = shuffled.slice(0, TOTAL_CHECKINS);

        const now = new Date();
        const quatroHorasAtras = new Date(now.getTime() - (4 * 60 * 60 * 1000));
        const dataHoje = now.toISOString().split('T')[0];

        // Lotes de check-in
        const checkins = [];
        const logs = [];

        for (const p of presentes) {
            const checkinTime = randomDate(quatroHorasAtras, now);
            checkins.push([1, checkinTime, p.id]); // status=1, data=time, id=p.id
            logs.push([p.id, eventoId, dataHoje, '192.168.0.1', 'SIMULATED_HASH', 0, 'PORTÃO_PRINCIPAL', checkinTime]);
        }

        // Atualizar Convidados
        // Bulk update não é trivial, vamos fazer um CASE ou loop. O loop de UPDATE é lento.
        // Solução hacker para MariaDB/MySQL Bulk Update: "INSERT INTO ... ON DUPLICATE KEY UPDATE"
        // Ou UPDATE com JOIN. Como é só mock, faço uma query combinada.
        
        console.log(`   - Atualizando status no banco de dados...`);
        for (let i = 0; i < TOTAL_CHECKINS; i += batchSize) {
            const batch = checkins.slice(i, i + batchSize);
            const cases = batch.map(c => `WHEN ${c[2]} THEN '${c[1].toISOString().slice(0, 19).replace('T', ' ')}'`).join(' ');
            const idsList = batch.map(c => c[2]).join(',');
            
            await conn.query(`
                UPDATE ${convTable} 
                SET status_checkin = 1, 
                    data_entrada = CASE id ${cases} END
                WHERE id IN (${idsList})
            `);
        }

        // Inserir Logs
        for (let i = 0; i < TOTAL_CHECKINS; i += batchSize) {
            const batch = logs.slice(i, i + batchSize);
            await conn.query(
                `INSERT INTO ${logsTable} (convidado_id, evento_id, data_ponto, ip, assinatura_hash, is_suspicious, station_id, criado_em) VALUES ?`,
                [batch]
            );
        }

        await conn.commit();
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n✅ [FINALIZADO] Mega Evento criado em ${duration.toFixed(2)} segundos!`);
        console.log(`🎫 Evento ID: ${eventoId}`);
        console.log(`👥 Convidados criados: ${TOTAL_GUESTS}`);
        console.log(`✅ Pessoas que fizeram check-in: ${TOTAL_CHECKINS}`);
        console.log(`👉 Acesse no Dashboard Frontend para ver os gráficos de estresse!`);

    } catch (err) {
        if (conn) await conn.rollback();
        console.error('🔥 Erro na simulação:', err);
    } finally {
        if (conn) conn.release();
        process.exit(0);
    }
}

runSimulator();
