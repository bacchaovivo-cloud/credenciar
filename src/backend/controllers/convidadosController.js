import QRCode from 'qrcode';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import pLimit from 'p-limit';
import { z } from 'zod';
import db, { registrarLog, getEventTablesList, validateTableName } from '../config/db.js';
import { generateSignature, checkFraudHeuristics, encryptBiometry, decryptBiometry } from '../utils/forensic.js';
import { getStatsEvento } from './zenithAnalyticsController.js';
import { CheckinService } from '../services/checkinService.js';
import { CacheService } from '../services/cacheService.js';
import { Logger } from '../utils/logger.js';
import { convidadoSchema, convidadoMassaSchema, checkinMassaSchema } from '../validations/schemas.js';

// Schema Zod para o endpoint de check-in
const checkinPayloadSchema = z.object({
  qrcode: z.string().min(1, 'QR Code é obrigatório'),
  evento_id: z.union([z.string(), z.number()]).transform(Number).refine(n => !isNaN(n) && n > 0, 'evento_id inválido'),
  station_id: z.string().optional(),
  photo: z.string().optional(),
  printer_ip: z.string().optional().nullable(),
  // Fix: aceita string '9100' ou number 9100 — clientes enviam ambos
  printer_port: z.union([z.string(), z.number()]).transform(Number).optional().default(9100),
  data_ponto: z.string().optional().nullable(),
});

export const getConvidados = async (req, res) => {
  const { eventoId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const rawLimit = parseInt(req.query.limit) || 50;
  // Fix: Impede exaustão de DB limitando a 500 itens por request
  const limit = Math.min(rawLimit, 500);
  const busca = req.query.busca || '';
  const categoria = req.query.categoria || 'TODOS';
  
  const offset = (page - 1) * limit;

  let queryWhere = 'WHERE evento_id = ?';
  const queryParams = [eventoId];

  if (categoria !== 'TODOS') {
    queryWhere += ' AND categoria = ?';
    queryParams.push(categoria);
  }

  if (busca) {
    queryWhere += ' AND (nome LIKE ? OR cpf LIKE ?)';
    queryParams.push(`%${busca}%`, `%${busca.replace(/\D/g, '')}%`);
  }

  const { convTable, logsTable } = getEventTablesList(eventoId);
  validateTableName(convTable);
  validateTableName(logsTable);
  const [countResult] = await db.query(`SELECT COUNT(id) as total FROM ${convTable} ${queryWhere}`, queryParams);
  const total = countResult[0].total;

  // Fix: eventoId passado como parâmetro ? na subquery em vez de interpolado diretamente
  const [rows] = await db.query(
    `SELECT id, nome, qrcode, categoria, evento_id, cpf, telefone, email, status_checkin, data_entrada, 
     (SELECT GROUP_CONCAT(DATE_FORMAT(data_ponto, '%Y-%m-%d')) FROM ${logsTable} WHERE convidado_id = ${convTable}.id) as dias_ponto_raw,
     (SELECT GROUP_CONCAT(CONCAT(IFNULL(CONCAT('Dia ', LPAD(DATEDIFF(DATE(data_ponto), (SELECT DATE(data_inicio) FROM eventos WHERE id = ?)) + 1, 2, '0'), ': '), ''), DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i:%s')) ORDER BY criado_em ASC SEPARATOR ' | ') FROM ${logsTable} WHERE convidado_id = ${convTable}.id) as dias_presente
     FROM ${convTable} ${queryWhere} 
     ORDER BY nome ASC 
     LIMIT ? OFFSET ?`,
    [eventoId, ...queryParams, limit, offset]
  );

  res.json({
    success: true,
    dados: rows,
    paginacao: {
      total,
      paginaAtual: page,
      totalPaginas: Math.ceil(total / limit),
      porPagina: limit
    }
  });
};

export const createConvidado = async (req, res) => {
  const { eventoId } = req.params;
  const { convTable } = getEventTablesList(eventoId);
  validateTableName(convTable);
  const data = convidadoSchema.parse(req.body);
  const qrcode = `BACCH_${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
  
  await db.query(
    `INSERT INTO ${convTable} (nome, qrcode, categoria, evento_id, cpf, telefone, email) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.nome, qrcode, data.categoria, eventoId, data.cpf || null, data.telefone || null, data.email || null]
  );
  
  const qrImage = await QRCode.toDataURL(qrcode);
  res.json({ success: true, qrcode, imagem: qrImage });
};

export const createConvidadosMassa = async (req, res) => {
  const { eventoId } = req.params;
  const { convTable } = getEventTablesList(eventoId);
  validateTableName(convTable);
  const data = convidadoMassaSchema.parse(req.body);
  
  if (!data.nomes || data.nomes.length === 0) return res.json({ success: true, totalInseridos: 0 });

  const values = data.nomes.map(n => {
    const qr = `BACCH_${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
    const nom = typeof n === 'string' ? n.trim() : n.nome.trim();
    const cpf = typeof n === 'string' ? null : (n.cpf || '').trim() || null;
    const tel = typeof n === 'string' ? null : (n.telefone || '').trim() || null;
    const eml = typeof n === 'string' ? null : (n.email || '').trim() || null;
    return [nom, qr, data.categoria, eventoId, cpf, tel, eml];
  });

  await db.query(
     `INSERT INTO ${convTable} (nome, qrcode, categoria, evento_id, cpf, telefone, email) VALUES ?`,
     [values]
  );

  res.json({ success: true, totalInseridos: values.length });
};

export const updateConvidado = async (req, res) => {
  const { id, eventoId } = req.params;
  const { convTable } = getEventTablesList(eventoId);
  validateTableName(convTable);
  const { nome, categoria, cpf, telefone, email, observacoes, tags } = req.body;

  const safeStringify = (val) => (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;

  await db.query(
    `UPDATE ${convTable} SET nome = ?, categoria = ?, cpf = ?, telefone = ?, email = ?, observacoes = ?, tags = ? WHERE id = ? AND evento_id = ?`, 
    [nome, categoria, cpf || null, telefone || null, email || null, safeStringify(observacoes) || null, safeStringify(tags) || null, id, eventoId]
  );
  res.json({ success: true, message: 'Convidado atualizado' });
};

export const deleteConvidado = async (req, res) => {
  const { id, eventoId } = req.params;
  const { convTable, logsTable } = getEventTablesList(eventoId);
  validateTableName(convTable);
  validateTableName(logsTable);
  const [[c]] = await db.query(`SELECT nome FROM ${convTable} WHERE id = ? AND evento_id = ?`, [id, eventoId]);
  if (!c) return res.status(404).json({ success: false, message: 'Convidado não encontrado neste evento' });
  
  await db.query(`DELETE FROM ${convTable} WHERE id = ? AND evento_id = ?`, [id, eventoId]);
  // Fix: Limpa fisicamente os logs do respectivo convidado (Prevenindo zumbificação no BD)
  await db.query(`DELETE FROM ${logsTable} WHERE convidado_id = ?`, [id]).catch(() => {});
  registrarLog(req.user.id, 'DELETAR_CONVIDADO', `Nome: ${c?.nome} (Evento: ${eventoId})`, req.ip);
  res.json({ success: true, message: 'Convidado removido' });
};

export const check = async (req, res) => {
  // Fix Bug#2: Validação Zod do payload — previne query com eventoId inválido (NaN tabelas)
  const parsed = checkinPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload inválido para check-in.',
      errors: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    });
  }

  const { qrcode, evento_id, photo, station_id, printer_ip, printer_port, data_ponto } = parsed.data;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // 🔒 TOTEM SECURITY HARDENING: Garante isolamento entre eventos para totens
  if (req.user?.role === 'TOTEM' && req.user.evento_atribuido) {
    if (Number(evento_id) !== Number(req.user.evento_atribuido)) {
      Logger.warn(`󰒃 [Totem Isolation Bypass Attempt] Totem assign to ${req.user.evento_atribuido} tried check-in for event ${evento_id}`, { ip });
      return res.status(403).json({ success: false, message: 'Acesso Negado: Dispositivo não autorizado para este evento.' });
    }
  }

  try {
     const result = await CheckinService.processarCheckin({
        qrcode,
        evento_id,
        ip,
        station_id,
        photo,
        printer_ip: printer_ip || null,
        printer_port: printer_port || 9100,
        data_ponto: data_ponto || null
     });

     // Emite evento socket se necessário
     const io = req.app.get('io');
     if (io && result.success) {
        io.emit('checkin', {
            id: result.participante.id,
            nome: result.participante.nome,
            evento_id,
            tipo: photo ? 'FACIAL' : 'QRCODE'
        });

        if (result.isVIP) {
            io.emit('vip_arrival', {
                nome: result.participante.nome,
                categoria: result.participante.categoria,
                evento_id,
                ts: new Date()
            });
        }
     }

     res.json(result);
  } catch (error) {
     Logger.error('Erro ao registrar check-in via Controller:', error);
     res.status(400).json({ 
        success: false, 
        message: error.message 
     });
  }
};

/**
 * CHECK-IN VIA RECONHECIMENTO FACIAL (FAST-PASS)
 * Recebe o descritor (vetor) e busca o convidado mais próximo no DB
 */
export const checkinFace = async (req, res) => {
  const { descriptor, evento_id, photo } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // 🔒 TOTEM SECURITY HARDENING
  if (req.user?.role === 'TOTEM' && req.user.evento_atribuido) {
    if (Number(evento_id) !== Number(req.user.evento_atribuido)) {
      return res.status(403).json({ success: false, message: 'Acesso Negado: Dispositivo não autorizado para este evento.' });
    }
  }

  try {
     const result = await CheckinService.processarCheckinBiometrico({
        descriptor,
        evento_id,
        ip,
        photo
     });

     const io = req.app.get('io');
     if (io && result.success) {
        if (result.isSuspicious) {
            io.emit('anomaly_alert', { 
              tipo: 'FACIAL', 
              nome: result.nome, 
              evento_id, 
              motivos: ['Risco Biométrico/Geográfico detectado via Fast-Pass']
            });
        }
        io.emit('checkin_sucesso', {
            id: result.id,
            nome: result.nome,
            evento_id,
            tipo: 'FACIAL'
        });
     }

     res.json(result);
  } catch (error) {
     Logger.error('Erro no checkinFace via Controller:', error);
     res.status(400).json({ success: false, message: error.message });
  }
};

export const updateFaceDescriptor = async (req, res) => {
  try {
    const { id, eventoId } = req.params;
    const { convTable } = getEventTablesList(eventoId);
    const { descriptor } = req.body;

    if (!descriptor) return res.json({ success: false, message: 'DESCRIÇÃO BIOMÉTRICA AUSENTE' });

    await db.query(
      `UPDATE ${convTable} SET face_descriptor = ? WHERE id = ?`,
      [JSON.stringify(descriptor), id]
    );

    // Invalida o Cache Biométrico da Memória para forçar releitura
    CacheService.delete(`bio_cache_${eventoId}`);

    registrarLog(req.user?.id, 'CADASTRO_FACE', `Convidado ID: ${id} (Evento: ${eventoId})`, req.ip);

    res.json({ success: true, message: '✅ BIOMETRIA CADASTRADA COM SUCESSO' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const checkinMassa = async (req, res) => {
  const { eventoId } = req.params;
  // Fix: Validação Zod completa do payload de sync
  let checkins;
  try {
    const parsed = checkinMassaSchema.parse({ evento_id: eventoId, checkins: req.body.checkins });
    checkins = parsed.checkins;
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Payload de sync inválido', errors: e.errors });
  }

  // 🔒 TOTEM SECURITY HARDENING
  if (req.user?.role === 'TOTEM' && req.user.evento_atribuido) {
    if (Number(eventoId) !== Number(req.user.evento_atribuido)) {
       return res.status(403).json({ success: false, message: 'Acesso Negado: Dispositivo não autorizado para este evento.' });
    }
  }

  const results = { sucessos: 0, falhas: 0 };
  
  // Limita a 5 conexões simultâneas para evitar estrangular pool do DB
  const limit = pLimit(5);

  const tasks = checkins.map(item => limit(async () => {
    try {
      const result = await CheckinService.processarCheckin({
        qrcode: item.qrcode,
        evento_id: item.evento_id || eventoId,
        station_id: item.station_id || 'EDGE_SYNC',
        data_entrada: item.data_entrada || null,
        data_ponto: item.data_ponto || null
      });
      if (result.success) results.sucessos++;
      else results.falhas++;
    } catch (e) {
      results.falhas++;
    }
  }));

  await Promise.allSettled(tasks);

  registrarLog(req.user?.id, 'EDGE_SYNC_MASSA', `Evento: ${eventoId} | Sucessos: ${results.sucessos} | Falhas: ${results.falhas}`, req.ip);
  res.json({ success: true, ...results });
};

export const desfazerCheckin = async (req, res) => {
  const { id, eventoId } = req.params;
  const { data_ponto } = req.query;
  const { convTable, logsTable } = getEventTablesList(eventoId);

  try {
    if (data_ponto) {
      const [delResult] = await db.query(
        `DELETE FROM ${logsTable} WHERE convidado_id = ? AND DATE_FORMAT(data_ponto, '%Y-%m-%d') = ?`, 
        [id, data_ponto]
      );
      console.log(`🗑️ [Undo] Convidado: ${id} | Dia: ${data_ponto} | Removidos: ${delResult.affectedRows}`);
      
      const [logsRestantes] = await db.query(`SELECT id, data_ponto FROM ${logsTable} WHERE convidado_id = ? ORDER BY criado_em ASC`, [id]);
      
      if (logsRestantes.length === 0) {
        await db.query(`UPDATE ${convTable} SET status_checkin = 0, data_entrada = NULL WHERE id = ?`, [id]);
      } else {
        await db.query(`UPDATE ${convTable} SET status_checkin = 1, data_entrada = (SELECT criado_em FROM ${logsTable} WHERE convidado_id = ? ORDER BY criado_em ASC LIMIT 1) WHERE id = ?`, [id, id]);
      }
      registrarLog(req.user.id, 'DESFAZER_CHECKIN_PARCIAL', `Convidado ID: ${id} Dia: ${data_ponto} (Evento: ${eventoId})`, req.ip);
    } else {
      await db.query(`UPDATE ${convTable} SET status_checkin = 0, data_entrada = NULL WHERE id = ?`, [id]);
      await db.query(`DELETE FROM ${logsTable} WHERE convidado_id = ?`, [id]);
      registrarLog(req.user.id, 'DESFAZER_CHECKIN_TOTAL', `Convidado ID: ${id} (Evento: ${eventoId})`, req.ip);
    }

    res.json({ success: true, message: data_ponto ? `Check-in do dia ${data_ponto} revertido` : 'Check-in total revertido' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportarCSV = async (req, res) => {
  const { eventoId } = req.params;
  const { convTable, logsTable } = getEventTablesList(eventoId);
  try {
    // Fix: eventoId passado como parâmetro ? na subquery
    const [rows] = await db.query(
      `SELECT nome, cpf, categoria, status_checkin, data_entrada,
       (SELECT GROUP_CONCAT(CONCAT(IFNULL(CONCAT('Dia ', LPAD(DATEDIFF(data_ponto, (SELECT data_inicio FROM eventos WHERE id = ?)) + 1, 2, '0'), ': '), ''), DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i:%s')) ORDER BY criado_em ASC SEPARATOR ' | ') FROM ${logsTable} WHERE convidado_id = ${convTable}.id) as dias_presente
       FROM ${convTable} 
       ORDER BY status_checkin DESC, nome ASC`,
      [eventoId]
    );

    // Função de Higienização Contra CSV Injection (CWE-1236)
    const sanitizeCSV = (str) => {
      if (!str) return '';
      const safe = String(str).replace(/"/g, '""');
      return /^[=+\-@]/.test(safe) ? `' ${safe}` : safe;
    };

    let csv = 'Nome;CPF;Categoria;Status;Primeira Entrada;Acessos\n';
    rows.forEach(r => {
      const status = r.status_checkin ? 'PRESENTE' : 'AUSENTE';
      const data = r.data_entrada ? new Date(r.data_entrada).toLocaleString('pt-BR') : '-';
      const acessos = r.dias_presente ? r.dias_presente : '-';
      csv += `"${sanitizeCSV(r.nome)}";"${sanitizeCSV(r.cpf)}";"${sanitizeCSV(r.categoria)}";"${status}";"${data}";"${acessos}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio_checkin_${eventoId}.csv`);
    // BOM para Excel reconhecer caracteres especiais (ç, ã)
    res.write('\uFEFF');
    res.write(csv);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const importarSmart = async (req, res) => {
  const { eventoId } = req.params;
  const { categoria, convidados } = req.body;
  const { convTable } = getEventTablesList(eventoId);
  
  if (!convidados || !Array.isArray(convidados) || convidados.length === 0) {
    return res.status(400).json({ success: false, message: 'Dados inválidos' });
  }

  const values = convidados.map(c => {
    const qrcode = `BACCH_${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
    return [c.nome, qrcode, categoria, eventoId, c.cpf || null, c.telefone || null, c.empresa || null, c.cargo || null];
  });

  await db.query(
    `INSERT INTO ${convTable} (nome, qrcode, categoria, evento_id, cpf, telefone, empresa, cargo) VALUES ?`,
    [values]
  );

  registrarLog(req.user?.id, 'IMPORT_SMART', `Evento: ${eventoId} | Total: ${convidados.length}`, req.ip);
  res.json({ success: true, total: convidados.length });
};

export const exportarXLSX = async (req, res) => {
  const { eventoId } = req.params;
  const { convTable, logsTable } = getEventTablesList(eventoId);
  
  // Fix: eventoId passado como parâmetro ? na subquery
  const [rows] = await db.query(
    `SELECT nome, cpf, telefone, qrcode, categoria, CASE WHEN status_checkin=1 THEN "Sim" ELSE "Não" END as presente, data_entrada,
     (SELECT GROUP_CONCAT(CONCAT(IFNULL(CONCAT('Dia ', LPAD(DATEDIFF(data_ponto, (SELECT data_inicio FROM eventos WHERE id = ?)) + 1, 2, '0'), ': '), ''), DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i:%s')) ORDER BY criado_em ASC SEPARATOR ' | ') FROM ${logsTable} WHERE convidado_id = ${convTable}.id) as dias_presente
     FROM ${convTable} ORDER BY nome ASC`,
    [eventoId]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Participantes');

  sheet.columns = [
    { header: 'Nome', key: 'nome', width: 30 },
    { header: 'CPF', key: 'cpf', width: 18 },
    { header: 'Telefone', key: 'telefone', width: 20 },
    { header: 'Setor', key: 'categoria', width: 15 },
    { header: 'Check-in (Geral)', key: 'presente', width: 15 },
    { header: 'Acessos (Multi-Dias)', key: 'dias_presente', width: 30 },
    { header: 'Primeira Entrada', key: 'data_entrada', width: 20 },
    { header: 'QR Code', key: 'qrcode', width: 20 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0ea5e9' } };
  sheet.addRows(rows);

  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(`relatorio_bacch_${eventoId}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

export const getSorteio = async (req, res) => {
  const { eventoId } = req.params;
  const { convTable } = getEventTablesList(eventoId);
  const [rows] = await db.query(
    `SELECT id, nome, categoria FROM ${convTable} WHERE status_checkin = 1`,
    []
  );
  res.json({ success: true, dados: rows });
};

export const resetCheckins = async (req, res) => {
  const { eventoId } = req.params;
  const { convTable } = getEventTablesList(eventoId);
  await db.query(`UPDATE ${convTable} SET status_checkin = 0, data_entrada = NULL`, []);
  registrarLog(req.user.id, 'RESET_CHECKINS', `Evento ID: ${eventoId}`, req.ip);
  res.json({ success: true });
};

export const importarEmMassa = async (req, res) => {
    const { eventoId } = req.params;
    const { convidados } = req.body;
    const { convTable } = getEventTablesList(eventoId);

    if (!Array.isArray(convidados) || convidados.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhum convidado enviado.' });
    }

    try {
        const values = convidados.map(c => [
            c.nome,
            c.cpf || null,
            c.email || null,
            c.categoria || 'GERAL',
            `BACCH_${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`,
            0 // status_checkin
        ]);

        const query = `INSERT IGNORE INTO ${convTable} (nome, cpf, email, categoria, qrcode, status_checkin) VALUES ?`;
        const [result] = await db.query(query, [values]);

        Logger.info(`Importação em massa concluída: ${result.affectedRows} novos registros no evento ${eventoId}`);
        res.json({ 
            success: true, 
            message: `${result.affectedRows} convidados importados com sucesso.`,
            duplicados: convidados.length - result.affectedRows 
        });
    } catch (error) {
        Logger.error('Erro na importação em massa:', error);
        res.status(500).json({ success: false, message: 'Falha interna no motor de importação.' });
    }
};