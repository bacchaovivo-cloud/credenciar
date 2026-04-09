/**
 * 🌐 Camada de Armazenamento Offline (IndexedDB)
 * Garante que o evento continue funcionando mesmo sem internet.
 */

const DB_NAME = 'BacchOfflineDB';
const DB_VERSION = 1;

export const initOfflineDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Tabela de Eventos (Cache)
            if (!db.objectStoreNames.contains('eventos')) {
                db.createObjectStore('eventos', { keyPath: 'id' });
            }
            
            // Tabela de Convidados (Cache por Evento)
            if (!db.objectStoreNames.contains('convidados')) {
                const store = db.createObjectStore('convidados', { keyPath: 'id' });
                store.createIndex('evento_id', 'evento_id', { unique: false });
                store.createIndex('qrcode_cpf', ['evento_id', 'qrcode', 'cpf'], { unique: false });
            }

            // Fila de Sincronização (Check-ins Pendentes)
            if (!db.objectStoreNames.contains('sync_queue')) {
                db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Salva ou atualiza uma lista de dados (convidados ou eventos)
 */
export const saveOfflineData = async (storeName, data) => {
    const db = await initOfflineDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    if (Array.isArray(data)) {
        data.forEach(item => store.put(item));
    } else {
        store.put(data);
    }
    
    return tx.complete;
};

/**
 * Busca dados offline
 */
export const getOfflineData = async (storeName, id = null) => {
    const db = await initOfflineDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    
    if (id) return new Promise(r => { store.get(id).onsuccess = (e) => r(e.target.result); });
    return new Promise(r => { store.getAll().onsuccess = (e) => r(e.target.result); });
};

/**
 * Busca convidado por QR ou CPF localmente (Modo Offline)
 */
export const findConvidadoOffline = async (eventoId, query) => {
    const db = await initOfflineDB();
    const tx = db.transaction('convidados', 'readonly');
    const store = tx.objectStore('convidados');
    const all = await new Promise(r => { store.getAll().onsuccess = (e) => r(e.target.result); });
    
    const cleaning = String(query).replace(/\D/g, '');
    return all.find(c => (c.evento_id == eventoId) && (c.qrcode == query || c.cpf == cleaning));
};

/**
 * Adiciona check-in na fila de sincronização
 */
export const queueCheckin = async (data) => {
    const db = await initOfflineDB();
    const tx = db.transaction('sync_queue', 'readwrite');
    tx.objectStore('sync_queue').add({ ...data, timestamp: new Date().toISOString() });
    return tx.complete;
};
