import 'dotenv/config';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/api`;
let token = '';

const testAudit = async () => {
    console.log('🚀 Iniciando Auditoria de API (Native Fetch)...');
    
    try {
        // 1. LOGIN
        console.log('🔐 Testando LOGIN...');
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'admin', senha: 'admin' })
        });
        const loginData = await loginRes.json();
        
        if (loginData.success) {
            token = loginData.token;
            console.log('✅ Login OK');
        } else {
            throw new Error(`Falha no login: ${loginData.message}`);
        }

        const headers = { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. EVENTOS: LISTAR
        console.log('📅 Testando LISTAR EVENTOS...');
        const evRes = await fetch(`${BASE_URL}/eventos`, { headers });
        const evData = await evRes.json();
        console.log(`✅ Listar Eventos OK (${evData.dados.length} encontrados)`);

        // 3. EVENTOS: CRIAR TESTE
        console.log('🆕 Testando CRIAR EVENTO...');
        const newEvRes = await fetch(`${BASE_URL}/eventos`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                nome: 'EVENTO AUDITORIA',
                data_evento: '2026-12-31',
                cor_primaria: '#ff0000',
                tipo_evento: 'Teste',
                capacidade_total: 100
            })
        });
        const newEvData = await newEvRes.json();
        const testEventoId = newEvData.id;
        console.log(`✅ Criar Evento OK (ID: ${testEventoId})`);

        // 4. CONVIDADOS: LISTAR
        console.log('👥 Testando LISTAR CONVIDADOS...');
        const convRes = await fetch(`${BASE_URL}/convidados/${testEventoId}`, { headers });
        const convData = await convRes.json();
        console.log(`✅ Listar Convidados OK`);

        // 5. CONVIDADOS: CRIAR
        console.log('👤 Testando CRIAR CONVIDADO...');
        const newConvRes = await fetch(`${BASE_URL}/convidados`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                nome: 'PARTICIPANTE TESTE',
                categoria: 'VIP',
                evento_id: testEventoId
            })
        });
        const newConvData = await newConvRes.json();
        const qrcode = newConvData.qrcode;
        console.log(`✅ Criar Convidado OK (QR: ${qrcode})`);

        // 6. CHECK-IN
        console.log('✅ Testando CHECK-IN...');
        const checkinRes = await fetch(`${BASE_URL}/convidados/checkin`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                qrcode,
                evento_id: testEventoId
            })
        });
        const checkinData = await checkinRes.json();
        console.log(`✅ Check-in OK: ${checkinData.message}`);

        // 7. STATS CONSOLIDADO
        console.log('📊 Testando STATS CONSOLIDADO...');
        const statsRes = await fetch(`${BASE_URL}/stats/consolidado`, { headers });
        const statsData = await statsRes.json();
        console.log(`✅ Stats OK`);

        // 8. SORTEIO
        console.log('🎲 Testando SORTEIO (PARTICIPANTES)...');
        const sorteioRes = await fetch(`${BASE_URL}/sorteio/${testEventoId}`, { headers });
        const sorteioData = await sorteioRes.json();
        console.log(`✅ Sorteio OK (${sorteioData.dados.length} presentes)`);

        // 9. LIMPEZA (DELETAR EVENTO)
        console.log('🧹 Testando DELETAR EVENTO (LIMPEZA)...');
        const delRes = await fetch(`${BASE_URL}/eventos/${testEventoId}`, {
            method: 'DELETE',
            headers
        });
        console.log('✅ Deletar Evento OK');

        console.log('\n🌟 AUDITORIA CONCLUÍDA COM SUCESSO! 🌟');
    } catch (error) {
        console.error('❌ ERRO NA AUDITORIA:', error.message);
        process.exit(1);
    }
};

testAudit();
