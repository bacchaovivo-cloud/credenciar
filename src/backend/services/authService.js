import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { Logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import Redis from 'ioredis';

// 🔐 ANTI-REPLAY BLACKLIST
// Previne o reuso de tokens TOTP dentro da janela de validade (90s)
const redis = env.REDIS_URL ? new Redis(env.REDIS_URL) : null;
const localCache = new Map(); // Fallback para dev/local sem Redis

const blacklistToken = async (userId, token) => {
  const key = `totp_used:${userId}:${token}`;
  if (redis) {
    await redis.set(key, '1', 'EX', 90);
  } else {
    localCache.set(key, Date.now() + 90000);
    // Limpeza periódica simples
    if (localCache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of localCache.entries()) {
        if (v < now) localCache.delete(k);
      }
    }
  }
};

const isTokenBlacklisted = async (userId, token) => {
  const key = `totp_used:${userId}:${token}`;
  if (redis) {
    return !!(await redis.get(key));
  }
  const expiry = localCache.get(key);
  if (expiry && expiry > Date.now()) return true;
  if (expiry) localCache.delete(key);
  return false;
};

/**
 * 🔒 MÉDIO-03: Comparação de recovery code resistente a timing attack
 */
const timingSafeCompare = (a, b) => {
  const bufA = Buffer.from(String(a).padEnd(64));
  const bufB = Buffer.from(String(b).padEnd(64));
  // Os dois buffers devem ter o mesmo tamanho para timingSafeEqual
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * 🔐 AUTH SERVICE (Zenith Excellence)
 * Gestão de 2FA TOTP e Segurança de Identidade.
 */
export class AuthService {

  static async generate2FA(usuarioId, email) {
    const secret = speakeasy.generateSecret({
      name: `Bacch CRM (${email})`,
      issuer: 'BacchProducoes'
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    
    // 🔐 HARDENING: Gerar chaves de recuperação usando CSPRNG
    const recoveryCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(6).toString('hex').toUpperCase()
    );

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      recoveryCodes
    };
  }

  static async verifyToken(secret, token, userId) {
    // 🛡️ ANTI-REPLAY: Verifica se o token já foi usado nesta janela
    if (await isTokenBlacklisted(userId, token)) {
        Logger.warn(`🚨 [SECURITY] Replay Attack Detectado: Token TOTP reutilizado para Usuário ${userId}`);
        return false;
    }

    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Janela de tolerância de +/- 30 segundos (drift do relógio)
    });

    if (isValid) {
        // Blacklista o token para os próximos 90 segundos
        await blacklistToken(userId, token);
    }

    return isValid;
  }

  static async enable2FA(usuarioId, secret, recoveryCodes) {
    // 🔒 FIX ARQU-05: Hasheia cada recovery code com bcrypt antes de salvar
    const BCRYPT_ROUNDS = 10;
    const hashedCodes = await Promise.all(
      recoveryCodes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS))
    );

    await db.query(
      'UPDATE usuarios SET two_factor_secret = ?, two_factor_enabled = 1, two_factor_recovery_codes = ? WHERE id = ?',
      [secret, JSON.stringify(hashedCodes), usuarioId]
    );
    Logger.info(`2FA Habilitado para Usuário ID: ${usuarioId}`);
  }

  static async disable2FA(usuarioId) {
    await db.query(
      'UPDATE usuarios SET two_factor_secret = NULL, two_factor_enabled = 0, two_factor_recovery_codes = NULL WHERE id = ?',
      [usuarioId]
    );
    Logger.warn(`2FA DESABILITADO para Usuário ID: ${usuarioId}`);
  }

  static async verifyRecoveryCode(usuarioId, code) {
    const [rows] = await db.query('SELECT two_factor_recovery_codes FROM usuarios WHERE id = ?', [usuarioId]);
    if (rows.length === 0 || !rows[0].two_factor_recovery_codes) return false;

    const codes = JSON.parse(rows[0].two_factor_recovery_codes);
    const upperCode = code.toUpperCase();

    // 🔒 FIX MÉDIO-03: Comparação resistente a timing attack usando bcrypt.compare
    // bcrypt.compare já é timing-safe por design
    let matchIndex = -1;
    for (let i = 0; i < codes.length; i++) {
      const isHash = codes[i].startsWith('$2');
      let matches = false;
      
      if (isHash) {
        // Novo formato: bcrypt hash
        matches = await bcrypt.compare(upperCode, codes[i]);
      } else {
        // Legado: texto puro (retrocompatibilidade)
        matches = timingSafeCompare(codes[i], upperCode);
      }
      
      if (matches) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex !== -1) {
      codes.splice(matchIndex, 1); // Remove o código usado (single-use)
      await db.query('UPDATE usuarios SET two_factor_recovery_codes = ? WHERE id = ?', [JSON.stringify(codes), usuarioId]);
      return true;
    }
    return false;
  }
}
