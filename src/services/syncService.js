import { apiRequest } from './api';
import { saveOfflineData, getOfflineData, initOfflineDB } from './storage';

/**
 * 📡 Serviço de Sincronização e Resiliência
 * Mantém o sistema vivo mesmo em condições de rede instáveis.
 */

let isSyncing = false;

/**
 * Puxa a lista completa de convidados para o armazenamento local (Pre-load)
 */
export const syncEventData = async (eventoId) => {
    if (!eventoId) return;
    try {
        console.log(`📡 [SYNC] Baixando convidados do evento ${eventoId} para o modo offline...`);
        const res = await apiRequest(`convidados/${eventoId}`);
        if (res.success && res.dados) {
            await saveOfflineData('convidados', res.dados);
            console.log(`✅ [SYNC] ${res.dados.length} convidados sincronizados localmente.`);
            return true;
        }
    } catch (err) {
        console.warn("⚠️ [SYNC] Falha ao baixar dados para o modo offline.", err.message);
    }
    return false;
};

/**
 * Envia check-ins acumulados offline para o servidor
 */
export const pushPendingCheckins = async () => {
    if (isSyncing) return;
    isSyncing = true;
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { syncing: true } }));

    try {
        const db = await initOfflineDB();
        const tx = db.transaction('sync_queue', 'readonly');
        const queueItems = await new Promise(r => { 
            tx.objectStore('sync_queue').getAll().onsuccess = (e) => r(e.target.result); 
        });

        if (queueItems.length > 0) {
            console.log(`📤 [SYNC] Enviando ${queueItems.length} check-ins offline para o servidor...`);
            
            for (const item of queueItems) {
                const res = await apiRequest('convidados/checkin', { 
                    qrcode: item.qrcode, 
                    evento_id: item.evento_id,
                    offline_time: item.timestamp 
                });
                
                if (res.success || res.message?.includes('JÁ REALIZOU')) {
                    // Remove da fila se enviado ou se já existia no servidor
                    const delTx = db.transaction('sync_queue', 'readwrite');
                    delTx.objectStore('sync_queue').delete(item.id);
                }
            }
            console.log("✅ [SYNC] Sincronização de check-ins pendentes concluída.");
        }
    } catch (err) {
        console.error("❌ [SYNC] Falha ao sincronizar check-ins pendentes.", err.message);
    } finally {
        isSyncing = false;
        window.dispatchEvent(new CustomEvent('sync-status', { detail: { syncing: false } }));
    }
};

/**
 * Monitora conexão para disparar o Sync automático
 */
window.addEventListener('online', () => {
    console.log("🌐 Internet voltou! Disparando sincronização de emergência...");
    pushPendingCheckins();
});

// Executa a cada 5 minutos se estiver online (Background Sync)
setInterval(() => {
    if (navigator.onLine) pushPendingCheckins();
}, 5 * 60 * 1000);
