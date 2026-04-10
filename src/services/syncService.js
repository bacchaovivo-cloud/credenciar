import { apiRequest } from './api';
import { ZenithEdge } from './dbLocal';

/**
 * 📡 ZENITH SYNC ENGINE: HIGH-RESILIENCE SYNC
 * Mantém a integridade dos dados entre o Edge Node e o Cloud Server.
 */

let isSyncing = false;
let retryCount = 0;

/**
 * Puxa a lista completa de convidados para o armazenamento local (Zenith Edge Cache)
 */
export const syncEventData = async (eventoId) => {
    if (!eventoId) return;
    try {
        console.log(`📡 [ZENITH-SYNC] Atualizando cache local para o evento ${eventoId}...`);
        const res = await apiRequest(`convidados/${eventoId}`);
        if (res.success && res.dados) {
            await ZenithEdge.persistirEvento(eventoId, res.dados);
            console.log(`✅ [ZENITH-SYNC] ${res.dados.length} convidados persistidos no Edge.`);
            return true;
        }
    } catch (err) {
        console.warn("⚠️ [ZENITH-SYNC] Falha ao atualizar cache offline.", err.message);
    }
    return false;
};

/**
 * Envia check-ins acumulados offline para o servidor com back-off exponencial
 */
export const pushPendingCheckins = async () => {
    if (isSyncing || !navigator.onLine) return;
    isSyncing = true;
    
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { syncing: true } }));

    try {
        const result = await ZenithEdge.sincronizar(apiRequest);
        
        if (result.success) {
            console.log(`✅ [ZENITH-SYNC] Sincronização concluída: ${result.total} registros enviados.`);
            retryCount = 0; // Reset na contagem de falhas
        } else if (result.error) {
            // Falha na rede ou servidor: Incrementa retry para o próximo ciclo
            retryCount++;
            console.warn(`⚠️ [ZENITH-SYNC] Falha no envio. Próxima tentativa com delay aumentado (Tentativa ${retryCount})`);
        }
    } catch (err) {
        console.error("❌ [ZENITH-SYNC] Erro catastrófico na sincronização:", err.message);
    } finally {
        isSyncing = false;
        window.dispatchEvent(new CustomEvent('sync-status', { detail: { syncing: false } }));
    }
};

/**
 * Monitora conexão para disparar o Sync automático
 */
window.addEventListener('online', () => {
    console.log("🌐 Internet restabelecida. Reconectando Zenith Edge...");
    pushPendingCheckins();
});

// Loop de Sincronização Inteligente (Back-off Exponencial)
const triggerSync = () => {
    if (navigator.onLine) {
        pushPendingCheckins();
    }
    
    // Calcula o próximo intervalo: Base 30s, dobra a cada erro até o limite de 15min
    const baseDelay = 30000;
    const maxDelay = 15 * 60 * 1000;
    const nextInterval = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    setTimeout(triggerSync, nextInterval);
};

// Inicia o loop
triggerSync();
