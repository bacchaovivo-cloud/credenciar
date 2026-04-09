import crypto from 'crypto';
import { AnomalyService } from '../services/anomalyService.js';
import { env } from '../config/env.js';

const EFFECTIVE_SALT = env.FORENSIC_SALT;

/**
 * GERA ASSINATURA DIGITAL Forense (SHA-256)
 */
export const generateSignature = (payload) => {
    return crypto.createHmac('sha256', EFFECTIVE_SALT)
        .update(JSON.stringify(payload))
        .digest('hex');
};

/**
 * 🛡️ BIOMETRIC VAULT: AES-256-GCM Encryption
 * Garante que os descritores faciais sejam ilegíveis mesmo com acesso ao DB.
 */
const ALGORITHM = 'aes-256-gcm';
// Deriva uma chave de 32 bytes do SALT para o AES
const KEY = crypto.scryptSync(EFFECTIVE_SALT, env.AES_IV_SALT || 'bacch_biometric_iv_salt_2026', 32);

export const encryptBiometry = (text) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    // Retorno Compacto: IV:TAG:DATA (Tudo em Hex)
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decryptBiometry = (encryptedData) => {
    try {
        const [ivHex, authTagHex, dataHex] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(dataHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        // Se falhar (ex: dados legados não criptografados), retorna o original para compatibilidade
        return encryptedData;
    }
};

export const checkFraudHeuristics = async (type, data, db) => {
    let isSuspicious = false;
    let score = 100;
    let reasons = [];

    // Regex de validação de nome de tabela dinâmico (defesa em profundidade)
    const TABLE_REGEX = /^checkin_logs_ev\d+$|^checkin_logs$/;

    // 1. VELOCITY CHECK (Fix: Usa a tabela isolada do evento se disponível)
    if (type === 'CHECKIN') {
        const { ip, eventoId, logsTable } = data;
        const logTable = logsTable || 'checkin_logs';
        if (!TABLE_REGEX.test(logTable)) throw new Error(`[SECURITY] Tabela inválida bloqueada: ${logTable}`);
        if (eventoId) {
            const [recent] = await db.query(
                `SELECT count(*) as count FROM ${logTable} WHERE ip = ? AND criado_em > DATE_SUB(NOW(), INTERVAL 5 SECOND)`,
                [ip]
            );
            if (recent && recent[0].count > 3) {
                isSuspicious = true;
                score -= 40; 
                reasons.push('Alta velocidade de operação (Bot/Script)');
            }
        }
    }

    // 2. GEOFENCING & IMPOSSIBLE TRAVEL (ELITE UPGRADE)
    if (type === 'CHECKIN' || type === 'ACTION') {
        const { ip, eventoId } = data;
        if (ip) {
            // Check Anti-Proxy
            const proxy = await AnomalyService.checkAntiProxy(ip);
            if (proxy.anomaly) {
                isSuspicious = true;
                score -= proxy.score;
                reasons.push(proxy.reason);
            }

            // Check Impossible Travel (Fix: Usa SEMPRE a tabela isolada se logsTable fornecida)
            if (eventoId) {
                const { logsTable } = data;
                const logTable = logsTable || null;
                // Só executa se tiver tabela isolada (não usa a tabela global legada)
                if (logTable && TABLE_REGEX.test(logTable)) {
                    const [lastCheck] = await db.query(
                        `SELECT ip, criado_em FROM ${logTable} WHERE ip != ? ORDER BY criado_em DESC LIMIT 1`,
                        [ip]
                    );
                    if (lastCheck && lastCheck.length > 0) {
                        const travel = await AnomalyService.checkImpossibleTravel(lastCheck[0], ip);
                        if (travel.anomaly) {
                            isSuspicious = true;
                            score -= travel.score;
                            reasons.push(travel.reason);
                        }
                    }

                    // Anchor IP check (usa tabela isolada, não a global)
                    const [anchor] = await db.query(
                        `SELECT ip FROM ${logTable} ORDER BY criado_em ASC LIMIT 1`
                    );
                    if (anchor && anchor.length > 0 && anchor[0].ip !== ip) {
                        const anchorPrefix = anchor[0].ip.split('.').slice(0, 2).join('.');
                        const currentPrefix = ip.split('.').slice(0, 2).join('.');
                        if (anchorPrefix !== currentPrefix) {
                            isSuspicious = true;
                            score -= 30;
                            reasons.push('Divergência geográfica de IP (Rede desconhecida)');
                        }
                    }
                }
            }
        }
    }

    return { isSuspicious, score, reasons };
};
