import { Logger } from '../utils/logger.js';
import db from '../config/db.js';

/**
 * 💬 ZENITH WHATSAPP SERVICE (Concierge Integration)
 */
export const WhatsAppService = {
    
    async enviarBoasVindas(participante, eventoId) {
        try {
            // 1. Busca configurações do Evento
            const [rows] = await db.query(
                'SELECT nome as evento_nome, whatsapp_enabled, whatsapp_template FROM eventos WHERE id = ?', 
                [eventoId]
            );
            
            if (rows.length === 0 || !rows[0].whatsapp_enabled) return;
            const config = rows[0];

            // 2. Prepara a mensagem (Template Parsing)
            const sanitize = (val) => String(val || '').replace(/[{}]/g, '');
            let msg = config.whatsapp_template
                .replace('{{nome}}', sanitize(participante.nome))
                .replace('{{evento}}', sanitize(config.evento_nome))
                .replace('{{categoria}}', sanitize(participante.categoria || 'Geral'));

            const tel = participante.telefone?.replace(/\D/g, '');
            if (!tel || tel.length < 10) {
                Logger.warn('⚠️ WhatsApp ignorado: Telefone inválido ou ausente.', { id: participante.id, tel });
                return;
            }

            // 3. Simulação de Disparo (Mocked para integração futura)
            // Futuramente integrar com Twilio, Z-API ou similar.
            Logger.info('📱 [ZENITH-WHATSAPP-MOCK]:', {
                destinatário: tel,
                conteúdo: msg,
                status: 'NA_FILA_VIRTUAL'
            });

            // Opcional: Registrar no log de auditoria
            // await registrarLog(null, eventoId, `Envio WhatsApp para ${participante.nome}`, 'SISTEMA');

            return { success: true, simulado: true };
        } catch (error) {
            Logger.error('Erro no WhatsAppService:', error);
            return { success: false, error: error.message };
        }
    }
};
