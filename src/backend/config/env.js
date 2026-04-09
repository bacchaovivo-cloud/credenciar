import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env do diretório raiz
dotenv.config({ path: path.join(__dirname, '../../../.env') });

/**
 * 🛡️ ENV SCHEMA (Fail-Fast Validation)
 * Define as variáveis obrigatórias para o CRM Bacch rodar.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  DB_HOST: z.string().min(1, "DB_HOST é obrigatório"),
  DB_USER: z.string().min(1, "DB_USER é obrigatório"),
  DB_PASS: z.string().default(''),
  DB_NAME: z.string().min(1, "DB_NAME é obrigatório"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres para segurança enterprise"),
  FORENSIC_SALT: z.string().min(16, "FORENSIC_SALT é obrigatório para o Biometric Vault"),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3001,http://localhost:4173'),
  AES_IV_SALT: z.string().default('bacch_biometric_iv_salt_2026'),
  // Redis: opcional — se vazio, usa cache in-memory
  REDIS_URL: z.string().optional().default(''),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ ERRO DE CONFIGURAÇÃO: Variáveis de ambiente inválidas:');
  console.error(_env.error.format());
  process.exit(1); // KILL SERVER IMMEDIATELY
}

export const env = _env.data;
