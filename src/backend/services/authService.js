import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import db from '../config/db.js';
import { Logger } from '../utils/logger.js';
import { env } from '../config/env.js';

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
    
    // Gerar chaves de recuperação (Enterprise standard)
    const recoveryCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substr(2, 8).toUpperCase());

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      recoveryCodes
    };
  }

  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1 // Janela de tolerância de +/- 30 segundos (drift do relógio)
    });
  }

  static async enable2FA(usuarioId, secret, recoveryCodes) {
    await db.query(
      'UPDATE usuarios SET two_factor_secret = ?, two_factor_enabled = 1, two_factor_recovery_codes = ? WHERE id = ?',
      [secret, JSON.stringify(recoveryCodes), usuarioId]
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
    const index = codes.indexOf(code.toUpperCase());

    if (index !== -1) {
      codes.splice(index, 1); // Remove o código usado
      await db.query('UPDATE usuarios SET two_factor_recovery_codes = ? WHERE id = ?', [JSON.stringify(codes), usuarioId]);
      return true;
    }
    return false;
  }
}
