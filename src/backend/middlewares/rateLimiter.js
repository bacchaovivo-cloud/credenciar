import rateLimit from 'express-rate-limit';

// 🌐 Limitador Global: Proteção contra ataques de negação de serviço (DoS)
// Impede que um único IP sobrecarregue o servidor inteiro.
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Janela de 1 minuto
  max: 100, // Limite de 100 requisições por minuto por IP
  message: {
    success: false,
    message: '⚠️ MUITAS REQUISIÇÕES: Por favor, aguarde um momento.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔒 Limitador de Autenticação (Login): Foco em impedir força bruta
// Se errar a senha 5 vezes em 15 minutos, o acesso é bloqueado temporariamente.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 5, // Limite de 5 tentativas de login
  message: {
    success: false,
    message: '⚠️ ACESSO BLOQUEADO: Muitas tentativas de login frustradas. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 📱 Limitador de Totem / Check-in: Foco em impedir spam de envios
// Permite bipa-das rápidas (1 a cada 4 segundos em média), mas bloqueia rajadas de robô.
export const checkinLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Janela de 1 minuto
  max: 15, // Limite de 15 check-ins por minuto por IP
  message: {
    success: false,
    message: '⚠️ CALMA LÁ: Você está bipando rápido demais! Aguarde 10 segundos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
