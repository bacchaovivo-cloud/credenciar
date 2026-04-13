import { env } from '../config/env.js';

/**
 * Middleware para simular condições adversas de rede e servidor (Modo Caos)
 * Simula Distribuição de Latência Realista (P95/P99)
 */
export const chaosMiddleware = (req, res, next) => {
  if (!env.CHAOS_MODE) return next();

  // 1. Distribuição de Latência (P95/P99 Simulator)
  // 90% das requisições: 50ms - 300ms (Normal)
  // 7% das requisições: 1s - 3s (P95 - Congestionamento)
  // 3% das requisições: 5s - 10s (P99 - Falha de Conectividade)
  const rand = Math.random();
  let delay = 0;

  if (rand < 0.90) {
    delay = Math.floor(Math.random() * 250) + 50;
  } else if (rand < 0.97) {
    delay = Math.floor(Math.random() * 2000) + 1000;
    console.log(`🐌 [CHAOS-P95] Latência alta detectada: ${delay}ms para ${req.url}`);
  } else {
    delay = Math.floor(Math.random() * 5000) + 5000;
    console.log(`🐢 [CHAOS-P99] LATÊNCIA CRÍTICA: ${delay}ms para ${req.url}`);
  }

  // 2. Simulação de Erros Aleatórios (2% de chance de erro 500)
  const errorChance = Math.random();
  
  setTimeout(() => {
    if (errorChance < 0.02) {
      console.log(`⚠️ [CHAOS] Erro 500 simulado para ${req.url}`);
      return res.status(500).json({ success: false, message: 'Simulação de falha de servidor (Chaos Mode).' });
    }
    
    // Log de performance para acompanhamento
    const start = Date.now();
    res.on('finish', () => {
       const duration = (Date.now() - start) + delay;
       if (duration > 1000) {
          console.log(`⏱️ [PERF-ALERT] ${req.method} ${req.url}: ${duration}ms`);
       }
    });

    next();
  }, delay);
};
