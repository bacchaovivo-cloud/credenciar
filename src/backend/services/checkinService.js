import db, { getEventTablesList, registrarLog } from '../config/db.js';
import { BrotherService } from './brotherService.js';
import { CacheService } from './cacheService.js';
import { generateSignature, checkFraudHeuristics, decryptBiometry } from '../utils/forensic.js';
import { Logger } from '../utils/logger.js';
import { WhatsAppService } from './whatsappService.js';
import { WebhookService, WebhookEvent } from './webhookService.js';
import { AlertService } from './alertService.js';

/**
 * 🏨 CHECK-IN SERVICE (Elite Business Logic)
 * Orquestra validação, gravação e hardware de forma atômica.
 */
export const CheckinService = {
    
    async processarCheckin(data) {
        const { qrcode, evento_id, ip, station_id, printer_ip, printer_port, photo, data_entrada, data_ponto } = data;
        const requestId = `checkin_${qrcode}_${evento_id}_${data_ponto || 'HOJE'}`;

        // 1. Verificação de Idempotência (Cache Anti-Spam para Câmeras/Scanners)
        const lastProcess = CacheService.get(requestId);
        if (lastProcess) {
            Logger.info('♻️ Idempotência: Bloqueando multi-scan repetido em 10s.', { qrcode, requestId });
            throw new Error(`⚠️ DUPLICIDADE: Ingresso já utilizado escaneado há instantes.`);
        }

        const { convTable, logsTable } = getEventTablesList(evento_id);

        try {
            // 2. Busca e Validação Forense Antifraude
            const buscaLimpa = String(qrcode).replace(/\D/g, '');
            const [participantes] = await db.query(
                `SELECT * FROM ${convTable} WHERE (qrcode = ? OR (cpf = ? AND cpf IS NOT NULL))`,
                [qrcode, buscaLimpa]
            );

            if (participantes.length === 0) throw new Error('Ingresso não encontrado.');
            const p = participantes[0];

            // Heurística de Fraude
            const fraud = await checkFraudHeuristics('CHECKIN', { ip, eventoId: evento_id, logsTable }, db);
            
            // 3. Verificação de Múltiplos Dias (Bloqueio Apenas para o Dia Informado)
            const pontoLimpo = (data_ponto && String(data_ponto).trim() !== '') ? data_ponto : null;
            const dataReferencia = pontoLimpo || new Date().toISOString().split('T')[0];
            
            const [checkinHoje] = await db.query(
                `SELECT id FROM ${logsTable} WHERE convidado_id = ? AND data_ponto = ?`,
                [p.id, dataReferencia]
            );

            if (checkinHoje.length > 0) {
                throw new Error(`⚠️ DUPLICIDADE: Ingresso já utilizado no dia específico (${dataReferencia}).`);
            }

            const entrada = data_entrada || new Date();
            await db.query(
                `UPDATE ${convTable} SET status_checkin = 1, data_entrada = IFNULL(data_entrada, ?) WHERE id = ?`,
                [entrada, p.id]
            );

            const assinatura = generateSignature({ convidadoId: p.id, mode: 'QR' });
            
            // Gravação no Banco (Ponto Crítico)
            await db.query(
                `INSERT INTO ${logsTable} (convidado_id, evento_id, data_ponto, ip, assinatura_hash, is_suspicious, station_id, checkin_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [p.id, evento_id, dataReferencia, ip, assinatura, (fraud.score < 70 ? 1 : 0), station_id || 'QR_SCAN', photo || null]
            );

            // 4. Log Forense Central
            await registrarLog(null, 'CHECKIN_QR', `Convidado: ${p.nome} | ID: ${p.id} | Evento: ${evento_id} | Station: ${station_id || 'Portal'} | Score: ${fraud.score}`, ip);

            // 💬 ZENITH WHATSAPP CONCIERGE (Opcional)
            WhatsAppService.enviarBoasVindas(p, evento_id).catch(e => Logger.error('FALHA_WHATSAPP:', e));

            // 5. Impressão (Fila Assíncrona)
            if (printer_ip) {
                await BrotherService.enqueue(p, evento_id, printer_ip, printer_port);
            }

            const isVIP = ['VIP', 'COORD', 'PRODU', 'DIRETORIA'].some(term => p.categoria?.toUpperCase().includes(term));

            const result = { success: true, participante: p, fraud_score: fraud.score, isVIP };

            // CORREÇÃO RACE CONDITION: O Cache só é setado AQUI, após o insert no banco ter sucesso sem jogar exceção
            CacheService.set(requestId, result, 10000);

            // 🚨 REAL-TIME ENTERPRISE EVENTS (Socket ID)
            const io = BrotherService.io; 
            if (io) {
              if (isVIP) {
                io.emit('vip_arrival', {
                  id: p.id,
                  nome: p.nome,
                  categoria: p.categoria,
                  evento_id: evento_id,
                  timestamp: new Date()
                });
              }
              io.emit('stats_update', { evento_id });
            }

            // Invalida caches de estatísticas
            CacheService.delete(`stats_evento_${evento_id}`);
            CacheService.delete('stats_dashboard_geral');
            CacheService.delete('stats_consolidado');

            if (fraud.score < 70 && io) {
              AlertService.checkinSuspeito(io, {
                convidado: p,
                evento_id,
                ip,
                fraud_score: fraud.score,
                reasons: fraud.reasons || [],
              });
            }

            WebhookService.dispatch(evento_id, WebhookEvent.CHECKIN, {
              convidado_id: p.id,
              nome: p.nome,
              categoria: p.categoria,
              qrcode: p.qrcode,
              station_id: station_id || 'QR_SCAN',
              fraud_score: fraud.score,
              is_suspicious: fraud.score < 70,
              timestamp: new Date().toISOString(),
            });

            return result;
        } catch (error) {
            // CORREÇÃO: Tratamento amigável para erro de Constraint do Banco de Dados
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
                 Logger.warn(`Tentativa de check-in duplicado detectada na constraint do DB para ${qrcode}`);
                 throw new Error(`⚠️ DUPLICIDADE: Este ingresso já registrou entrada no sistema principal.`);
            }

            Logger.error('Erro no CheckinService:', error, { qrcode });
            throw error;
        }
    },

    async processarCheckinBiometrico(data) {
        const { descriptor, evento_id, ip, photo } = data;
        const { convTable, logsTable } = getEventTablesList(evento_id);
        const targetDescriptor = new Float32Array(descriptor);
        
        let melhorMatch = null;

        try {
            // 1. Busca Biométrica Enterprise (Cache)
            const bioCacheKey = `bio_cache_${evento_id}`;
            let poolBiometrico = CacheService.get(bioCacheKey);

            if (!poolBiometrico) {
                const [convidados] = await db.query(
                    `SELECT id, nome, face_descriptor FROM ${convTable} WHERE face_descriptor IS NOT NULL`, []
                );
                poolBiometrico = [];
                for (const c of convidados) {
                    try {
                        const decrypted = decryptBiometry(c.face_descriptor);
                        const saved = new Float32Array(JSON.parse(decrypted));
                        poolBiometrico.push({ id: c.id, nome: c.nome, saved });
                    } catch (e) { continue; }
                }
                // CORREÇÃO PARCIAL DE MEMÓRIA: Reduzido o tempo de vida do cache se for um evento massivo. 
                // Ideal futuro: Mover para um banco vetorial como RedisSearch ou Milvus.
                CacheService.set(bioCacheKey, poolBiometrico, 3600000); // 1 hora
            }

            let menorDistancia = 0.6;

            for (const convidado of poolBiometrico) {
                const saved = convidado.saved;
                let sum = 0;
                for (let i = 0; i < 128; i++) sum += Math.pow(targetDescriptor[i] - saved[i], 2);
                const distance = Math.sqrt(sum);
                if (distance < menorDistancia) {
                    menorDistancia = distance;
                    melhorMatch = convidado;
                }
            }

            if (!melhorMatch) throw new Error('Biometria não reconhecida.');

            // 2. Fluxo Padrão de Gravação (Atômico)
            const dataHoje = new Date().toISOString().split('T')[0];
            const [checkinLog] = await db.query(`SELECT id FROM ${logsTable} WHERE convidado_id = ? AND data_ponto = ?`, [melhorMatch.id, dataHoje]);
            
            if (checkinLog.length > 0) {
                return { success: true, alreadyIn: true, message: 'BEM VINDO DE VOLTA!', nome: melhorMatch.nome, convidado_id: melhorMatch.id };
            }

            const fraud = await checkFraudHeuristics('CHECKIN', { ip, eventoId: evento_id, convidadoId: melhorMatch.id }, db);
            const assinatura = generateSignature({ convidadoId: melhorMatch.id, mode: 'FACE' });

            await db.query(
                `INSERT INTO ${logsTable} (convidado_id, evento_id, data_ponto, ip, assinatura_hash, is_suspicious, station_id, checkin_photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                [melhorMatch.id, evento_id, dataHoje, ip, assinatura, fraud.isSuspicious ? 1 : 0, 'FACE_ID', photo || null]
            );

            await db.query(`UPDATE ${convTable} SET status_checkin = 1, data_entrada = IFNULL(data_entrada, NOW()) WHERE id = ?`, [melhorMatch.id]);

            WhatsAppService.enviarBoasVindas(melhorMatch, evento_id).catch(e => Logger.error('FALHA_WHATSAPP_BIOMETRIA:', e));

            return { 
                success: true, 
                message: '✅ ACESSO LIBERADO (FAST-PASS)', 
                nome: melhorMatch.nome, 
                id: melhorMatch.id,
                precisao: (1 - menorDistancia).toFixed(2),
                isSuspicious: fraud.isSuspicious
            };
        } catch (error) {
            // Tratamento amigável para erro de Constraint (Caso aconteça via FaceID)
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
                Logger.warn(`Biometria repetida detectada na constraint do DB para convidado ID ${melhorMatch?.id}`);
                throw new Error(`⚠️ DUPLICIDADE: Rosto já processado.`);
            }
            Logger.error('Erro no CheckinService (Biometria):', error);
            throw error;
        } finally {
            if (melhorMatch) {
              registrarLog(null, 'CHECKIN_FACE', `Biometria: ${melhorMatch.nome} | ID: ${melhorMatch.id} | Evento: ${evento_id} | IP: ${ip}`, ip);
            }
        }
    }
};