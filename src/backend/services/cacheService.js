/**
 * ⚡ CACHE SERVICE (Redis Adapter com Fallback In-Memory)
 * API unificada: quando REDIS_URL está definida, usa Redis.
 * Sem Redis: usa Map() in-memory com LRU cap.
 * Zero mudanças necessárias no código que usa este serviço.
 */

import { env } from '../config/env.js';

// --- Adapter In-Memory (sempre disponível como fallback) ---
const storage = new Map();
const MAX_CACHE_ENTRIES = 500;

const memoryAdapter = {
  get(key) {
    const item = storage.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) { storage.delete(key); return null; }
    return item.value;
  },
  set(key, value, ttlMs) {
    if (storage.size >= MAX_CACHE_ENTRIES) {
      storage.delete(storage.keys().next().value);
    }
    storage.set(key, { value, expiresAt: Date.now() + ttlMs });
  },
  delete(key) { storage.delete(key); },
  clearExpired() {
    const now = Date.now();
    for (const [key, item] of storage.entries()) {
      if (now > item.expiresAt) storage.delete(key);
    }
  },
  size() { return storage.size; },
};

// --- Adapter Redis (ativado se REDIS_URL estiver definida) ---
let redisAdapter = null;

if (env.REDIS_URL) {
  try {
    const { default: Redis } = await import('ioredis').catch(() => ({ default: null }));
    if (Redis) {
      const client = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      await client.connect().catch(() => {
        console.warn('[CacheService] Redis não disponível, usando in-memory.');
      });

      if (client.status === 'ready') {
        redisAdapter = {
          async get(key) {
            const val = await client.get(key);
            return val ? JSON.parse(val) : null;
          },
          async set(key, value, ttlMs) {
            await client.set(key, JSON.stringify(value), 'PX', ttlMs);
          },
          async delete(key) {
            await client.del(key);
          },
          clearExpired() { /* Redis gerencia TTL automaticamente */ },
          size() { return -1; /* Redis não expera count local */ },
        };
        console.log('[CacheService] ✅ Redis conectado:', env.REDIS_URL);
      }
    }
  } catch (e) {
    console.warn('[CacheService] Erro ao conectar Redis, usando in-memory:', e.message);
  }
}

const adapter = redisAdapter || memoryAdapter;

export const CacheService = {
  set(key, value, ttlMs = 300000) {
    return adapter.set(key, value, ttlMs);
  },
  get(key) {
    return adapter.get(key);
  },
  delete(key) {
    return adapter.delete(key);
  },
  clearExpired() {
    return adapter.clearExpired();
  },
  size() {
    return adapter.size();
  },
  isRedis() {
    return redisAdapter !== null;
  },
};

// Auto-clean para o adapter in-memory (Redis não precisa)
if (!redisAdapter) {
  setInterval(() => CacheService.clearExpired(), 600000);
}
