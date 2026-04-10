import { ZodError } from 'zod';
// 🔐 CORREÇÃO: Importando o env validado pelo seu Zod
import { env } from '../config/env.js'; 

export const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return res.status(400).json({
      success: false,
      message: 'Erros de validação nos dados enviados.',
      errors: errorMessages
    });
  }

  // 🔐 CORREÇÃO: Usando a variável blindada e garantida pelo sistema
  const isDev = env.NODE_ENV === 'development';
  console.error('🔥 Erro na Aplicação:', err.stack || err.message);

  res.status(err.status || 500).json({
    success: false,
    message: isDev ? `❌ FALHA TÉCNICA: ${err.message}` : '❌ Ocorreu um erro interno no servidor. Tente novamente mais tarde.'
  });
};