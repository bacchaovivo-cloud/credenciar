import db, { getEventTablesList, registrarLog } from '../config/db.js';
import { Logger } from '../utils/logger.js';

/**
 * MOTOR DE BACKUP ISOLADO POR EVENTO
 * Gera um pacote completo com todos os dados de um evento específico.
 */
export const backupEvento = async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    try {
        const { id } = req.params;
        const eventoId = parseInt(id);

        if (!eventoId || eventoId <= 0) return res.status(400).json({ success: false, message: 'ID do evento inválido.' });

        // Verifica autorização — Admin acessa qualquer evento, Manager apenas o seu
        const userRole = (req.user?.role || '').toUpperCase();
        if (userRole !== 'ADMIN') {
            const userEventId = req.user?.evento_atribuido || req.user?.evento_id;
            if (parseInt(userEventId) !== eventoId) {
                await registrarLog(req.user?.id, 'BACKUP_UNAUTHORIZED', `Tentativa negada de backup do evento ${eventoId}`, ip);
                return res.status(403).json({ success: false, message: 'Acesso negado: backup de evento não autorizado.' });
            }
        }

        // 🔐 AUDITORIA: Registra a geração do backup
        await registrarLog(req.user?.id, 'BACKUP_GENERATE', `Geração de backup para o Evento: ${eventoId}`, ip);

        const { convTable, logsTable } = getEventTablesList(eventoId);

        const [evento] = await db.query('SELECT * FROM eventos WHERE id = ? LIMIT 1', [eventoId]);
        if (!evento[0]) return res.status(404).json({ success: false, message: 'Evento não encontrado.' });

        const [rawConvidados] = await db.query(
          `SELECT id, evento_id, nome, cpf, telefone, email, categoria, qrcode, tipo_entrada,
                  status_checkin, data_entrada, cargo, empresa, observacoes, tags, criado_em
           FROM ${convTable} LIMIT 50000`
        );

        // 🔐 PRIVACY HARDENING: Mascaramento de PII baseado em Role (LGPD Compliance)
        // Se não for ADMIN, mascara dados sensíveis para evitar exfiltração em massa.
        const convidados = userRole === 'ADMIN' ? rawConvidados : rawConvidados.map(c => ({
            ...c,
            cpf: c.cpf ? c.cpf.replace(/^(\d{3}).*(\d{2})$/, '$1.***.***-$2') : null,
            email: c.email ? c.email.replace(/^(..)(.*)(@.*)$/, '$1***$3') : null,
            telefone: c.telefone ? c.telefone.replace(/^(..)(.*)(..)$/, '$1*****$3') : null
        }));

        const [checkins] = await db.query(`SELECT * FROM ${logsTable} LIMIT 100000`);
        const [setores] = await db.query('SELECT * FROM setores_evento WHERE evento_id = ?', [eventoId]);

        const [logs] = await db.query(
          `SELECT id, usuario_id, acao, detalhes, ip, criado_em, sec_score
           FROM audit_logs
           WHERE detalhes LIKE ? AND criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)
           ORDER BY criado_em DESC LIMIT 2000`,
          [`%Evento: ${eventoId}%`]
        );

        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                versao: '8.1-ENTERPRISE-PRIVACY',
                evento: evento[0]?.nome || 'Desconhecido',
                gerado_por: req.user?.nome || 'Sistema',
                gerado_por_id: req.user?.id || null,
                pii_masked: userRole !== 'ADMIN'
            },
            data: {
                evento: evento[0],
                convidados,
                checkins,
                setores,
                audit_logs: logs
            }
        };

        const fileName = `BACKUP_BACCH_EV${eventoId}_${new Date().toISOString().split('T')[0]}.json`;

        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(backupData, null, 2));

    } catch (error) {
        Logger.error('Erro ao gerar backup isolado:', error);
        res.status(500).json({ success: false, message: 'Falha crítica ao gerar backup.' });
    }
};
