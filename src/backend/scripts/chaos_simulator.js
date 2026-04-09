import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Carrega .env do backend para obter a SECRET
dotenv.config({ path: '../../../.env' });
const SECRET_KEY = process.env.JWT_SECRET || 'bacch_ultra_secret_key_2026';

/**
 * ZENITH CHAOS SIMULATOR
 * Testa a resiliência do servidor disparando milhares de requisições de check-in concorrentes.
 */

const API_URL = 'http://localhost:3001/api';
let EVENTO_ID = 1;

// Configuração do Teste
const TOTAL_CHECKINS = 500;
const CONCORRENCIA = 50;

function generateTestToken() {
    console.log('🔐 Gerando Token JWT de Engenharia (Bypass)...');
    return jwt.sign({ id: 999, role: 'ADMIN' }, SECRET_KEY, { algorithm: 'HS256', expiresIn: '1h' });
}

async function runChaos(token) {
    console.log(`\n🔥 [ZENITH CHAOS SIMULATOR INICIADO] 🔥`);
    console.log(`Alvo: ${API_URL}/convidados/checkin`);
    console.log(`Carga: ${TOTAL_CHECKINS} requisições (Concorrência: ${CONCORRENCIA})\n`);

    let sucessos = 0;
    let falhas = 0;
    // O backend cria UUID pro qrcode mas no load test podemos chutar strings randômicas
    // Ele vai bater no DB, não achar o ingresso, e deve voltar HTTP 400.
    // Mas para testar "Inserção real", podemos testar a rota "import-smart" ou "massa" de convidados primeiro,
    // ou apenas estressar o /checkin de leitura rápida para medir latencia e falhas.
    
    const preQrcodes = Array.from({length: TOTAL_CHECKINS}, () => ` BACCH_${crypto.randomBytes(4).toString('hex').toUpperCase()} `);

    const startTime = Date.now();
    
    // Evitando loop Promise estourar V8
    for (let i = 0; i < TOTAL_CHECKINS; i += CONCORRENCIA) {
        const batch = preQrcodes.slice(i, i + CONCORRENCIA);
        await Promise.all(batch.map(async (qr) => {
            try {
                // Bypass do RateLimit falsificando cabeçalhos IP pseudo-randômicos (Express Rate Limit usa Req IP)
                // Se o limit é global, os headers locais não adiantam se 'trust proxy' não estiver ativo no express.
                // Mas vamos rodar pra ver de onde ele cai.
                const randomIP = `192.168.1.${Math.floor(Math.random() * 255)}`;
                
                const res = await fetch(`${API_URL}/convidados/checkin`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'x-forwarded-for': randomIP 
                    },
                    body: JSON.stringify({
                        qrcode: qr.trim(),
                        evento_id: EVENTO_ID,
                        station_id: 'CHAOS_BOT'
                    })
                });
                
                // 400 (Bad Request - Ingresso não encontrado) é o correto se ele bateu na heurística.
                // 429 é Rate Limit.
                // 500 é erro do servidor (o que queremos evitar).
                if (res.status === 429) {
                    falhas++;
                } else if (res.status === 200 || res.status === 400 || res.status === 404) {
                    // É um sucesso de resposta do sistema (mesmo que erro de regra de negócio)
                    sucessos++;
                } else {
                    falhas++;
                }
            } catch (e) {
                falhas++;
            }
        }));
        process.stdout.write(`\rProgresso: ${i + batch.length}/${TOTAL_CHECKINS}`);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n\n📊 [RELATÓRIO DE ESTRESSE]`);
    console.log(`Tempo Total: ${duration.toFixed(2)} segundos`);
    console.log(`Requisições p/ segundo: ${(TOTAL_CHECKINS / duration).toFixed(2)} req/s`);
    console.log(`✅ Sucessos na Resposta (HTTP 200/400/404): ${sucessos}`);
    console.log(`❌ Rate Limits (HTTP 429) ou Erros (500): ${falhas}`);
}

async function init() {
    const token = generateTestToken();
    await runChaos(token);
}

init();
