import Dexie from 'dexie';

/**
 * 📦 ZENITH EDGE: LOCAL DATABASE (IndexedDB)
 * Abstração de persistência local para garantir operabilidade offline total.
 */
export const dbLocal = new Dexie('ZenithEdgeDB');

dbLocal.version(2).stores({
    convidados: '++id, qrcode, nome, cpf, status_checkin, evento_id, face_descriptor',
    syncQueue: '++id, type, payload, timestamp',
    eventConfig: 'id, nome, whatsapp_enabled',
    bioCache: '++id, convidado_id, descriptor, timestamp'
});

export const ZenithEdge = {
    
    // Salva a base completa do evento para uso offline
    async persistirEvento(eventoId, convidados) {
        await dbLocal.convidados.where('evento_id').equals(eventoId).delete();
        const data = convidados.map(c => ({ ...c, evento_id: eventoId }));
        await dbLocal.convidados.bulkAdd(data);
    },

    // Registra um check-in na fila local e marca o convidado como presente localmente
    async registrarCheckinOffline(qrcode, data) {
        // 1. Atualiza status local para feedback instantâneo na UI
        await dbLocal.convidados.where('qrcode').equals(qrcode).modify({ status_checkin: 1, data_entrada: new Date() });

        // 2. Adiciona na fila de sincronização
        await dbLocal.syncQueue.add({
            type: 'CHECKIN',
            payload: { qrcode, ...data },
            timestamp: Date.now()
        });
    },

    // Busca um convidado no banco local comparando descritores biométricos (Offline FaceID)
    // Evoluído v2: Agora utiliza o biometricWorker para performance máxima
    async buscarPorBiometria(descriptor) {
        const convidadosComBio = await dbLocal.convidados
            .filter(c => !!c.face_descriptor)
            .toArray();

        if (convidadosComBio.length === 0) return null;

        return new Promise((resolve, reject) => {
            const worker = new Worker(new URL('../workers/biometricWorker.js', import.meta.url), { type: 'module' });
            
            worker.onmessage = (e) => {
                worker.terminate();
                if (e.data.error) reject(e.data.error);
                else resolve(e.data.bestMatch);
            };

            worker.onerror = (err) => {
                worker.terminate();
                reject(err);
            };

            worker.postMessage({ 
                descriptor: Array.from(descriptor), 
                convidadosComBio,
                threshold: 0.55 // Ajustado para ser levemente mais rigoroso no Edge Mode
            });
        });
    },

    // Busca rápida via QR ou CPF offline (Fix #9: Filtra no servidor Dexie, não carrega tudo na RAM)
    async buscarPorQr(eventoId, query) {
        const queryStr = String(query).trim();
        const cleaning = queryStr.replace(/\D/g, '');
        
        // Tenta primeiro por QR code (indexado)
        const porQr = await dbLocal.convidados
            .where('qrcode').equals(queryStr)
            .and(c => c.evento_id == eventoId)
            .first();
        if (porQr) return porQr;
        
        // Fallback: busca por CPF (também filtrado com evento_id)
        if (cleaning.length >= 11) {
            return dbLocal.convidados
                .where('evento_id').equals(eventoId)
                .filter(c => c.cpf && c.cpf.replace(/\D/g, '') === cleaning)
                .first();
        }
        return null;
    },

    // Consome a fila e envia para o servidor
    async sincronizar(apiHandler) {
        const queue = await dbLocal.syncQueue.toArray();
        if (queue.length === 0) return { total: 0 };

        try {
            // Agrupa por tipo se necessário, aqui focamos em CHECKIN
            const checkins = queue.filter(q => q.type === 'CHECKIN').map(q => q.payload);
            
            const res = await apiHandler('convidados/checkin/massa', { 
                evento_id: checkins[0].evento_id, 
                checkins 
            }, 'POST');

            if (res.success) {
                // Limpa apenas o que foi enviado com sucesso
                const ids = queue.map(q => q.id);
                await dbLocal.syncQueue.bulkDelete(ids);
                return { success: true, total: checkins.length };
            }
            return { success: false };
        } catch (error) {
            console.error('❌ Falha na sincronização Zenith Edge:', error);
            return { success: false, error };
        }
    }
};
