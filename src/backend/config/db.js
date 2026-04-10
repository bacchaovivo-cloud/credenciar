import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { generateSignature, checkFraudHeuristics } from '../utils/forensic.js';

// 🔐 CORREÇÃO: Importando o env validado pelo Zod. 
// Isso substitui a necessidade de carregar o dotenv manualmente aqui e elimina os fallbacks inseguros.
import { env } from '../config/env.js';

const db = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS || '', // Mantido o fallback de string vazia apenas caso o root local não tenha senha
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

db.getConnection()
  .then(() => console.log('✅ Banco de Dados Bacch Conectado!'))
  .catch(err => console.error('❌ Erro no MySQL:', err.message));

// Migrações dinâmicas para o Banco de Dados (Suporte MariaDB/MySQL antigo)
export const migrate = async () => {
  // Garante tabela de audit_logs
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario_id INT,
      acao VARCHAR(100) NOT NULL,
      detalhes TEXT,
      ip VARCHAR(45),
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});

  // Garante coluna cor_primaria na tabela eventos
  await db.query(`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS cor_primaria VARCHAR(20) DEFAULT '#0ea5e9'`).catch(() => {});

  // Garante tabela de setores por evento
  await db.query(`
    CREATE TABLE IF NOT EXISTS setores_evento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      evento_id INT NOT NULL,
      nome VARCHAR(100) NOT NULL,
      icone VARCHAR(10) DEFAULT '🏷️',
      cor VARCHAR(20) DEFAULT '#0ea5e9',
      capacidade INT DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
    )
  `).catch(() => {});

  const addColumn = async (table, column, type) => {
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
      if (cols.length === 0) {
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`✅ Coluna ${column} adicionada em ${table}`);
      }
    } catch (err) { console.error(`Erro ao migrar ${column}:`, err.message); }
  };

  await addColumn('eventos', 'tipo_evento', "VARCHAR(50) DEFAULT 'Evento'");
  await addColumn('eventos', 'descricao', "TEXT");
  await addColumn('eventos', 'capacidade_total', "INT DEFAULT 0");
  await addColumn('eventos', 'data_inicio', "DATE");
  await addColumn('eventos', 'data_fim', "DATE");
  await addColumn('eventos', 'local', "VARCHAR(255)");
  await addColumn('eventos', 'logo_url', "VARCHAR(255) DEFAULT NULL");
  await addColumn('eventos', 'background_url', "VARCHAR(255) DEFAULT NULL");
  await addColumn('eventos', 'config_totem', "JSON DEFAULT NULL");
  await addColumn('eventos', 'whatsapp_enabled', "TINYINT(1) DEFAULT 0");
  await addColumn('eventos', 'whatsapp_template', "TEXT DEFAULT 'Olá {{nome}}, seja bem-vindo ao {{evento}}! Seu acesso ao setor {{categoria}} foi liberado.'");
  
  // Configurações de Impressão Brother QL-820NWB
  await addColumn('eventos', 'printer_ip', "VARCHAR(45) DEFAULT NULL");
  await addColumn('eventos', 'printer_port', "INT DEFAULT 9100");
  await addColumn('eventos', 'label_template_json', "JSON DEFAULT NULL");
  await addColumn('checkin_logs', 'station_id', "VARCHAR(100) DEFAULT NULL");
  await addColumn('print_jobs', 'finalizado_em', "TIMESTAMP NULL DEFAULT NULL");

  await addColumn('convidados', 'cargo', "VARCHAR(100) DEFAULT NULL");
  await addColumn('convidados', 'empresa', "VARCHAR(100) DEFAULT NULL");
  await addColumn('convidados', 'email', "VARCHAR(255) DEFAULT NULL");
  await addColumn('convidados', 'telefone', "VARCHAR(20) DEFAULT NULL");
  await addColumn('convidados', 'observacoes', "TEXT DEFAULT NULL");
  await addColumn('convidados', 'tags', "TEXT DEFAULT NULL");
  await addColumn('convidados', 'face_descriptor', "TEXT DEFAULT NULL");

  // --- INFRAESTRUTURA FORENSE MILITAR ---
  await addColumn('audit_logs', 'sec_hash', "VARCHAR(128) DEFAULT NULL");
  await addColumn('audit_logs', 'user_agent', "TEXT DEFAULT NULL");
  await addColumn('audit_logs', 'sec_score', "INT DEFAULT 100");
  await addColumn('checkin_logs', 'assinatura_hash', "VARCHAR(128) DEFAULT NULL");
  await addColumn('checkin_logs', 'ip', "VARCHAR(45) DEFAULT NULL");
  await addColumn('checkin_logs', 'is_suspicious', "TINYINT(1) DEFAULT 0");
  await addColumn('checkin_logs', 'checkin_photo', "LONGTEXT DEFAULT NULL");

  // Índices Críticos para Performance
  await db.query(`CREATE INDEX IF NOT EXISTS idx_audit_criado_em ON audit_logs(criado_em DESC)`).catch(() => {});
  await db.query(`CREATE INDEX IF NOT EXISTS idx_qrcode ON convidados(qrcode)`).catch(() => {});
  await db.query(`CREATE INDEX IF NOT EXISTS idx_evento_id ON convidados(evento_id)`).catch(() => {});
  await db.query(`CREATE INDEX IF NOT EXISTS idx_cpf ON convidados(cpf)`).catch(() => {});
  await db.query(`CREATE INDEX IF NOT EXISTS idx_tel ON convidados(telefone)`).catch(() => {});
  await db.query(`CREATE INDEX IF NOT EXISTS idx_evento_checkin ON convidados(evento_id, status_checkin)`).catch(() => {});

  await addColumn('usuarios', 'two_factor_secret', "VARCHAR(128) DEFAULT NULL");
  await addColumn('usuarios', 'two_factor_enabled', "TINYINT(1) DEFAULT 0");
  await addColumn('usuarios', 'two_factor_recovery_codes', "TEXT DEFAULT NULL");

  // Fila de Impressão Persistente
  await db.query(`
    CREATE TABLE IF NOT EXISTS print_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      convidado_id INT NOT NULL,
      evento_id INT NOT NULL,
      printer_ip VARCHAR(45) NOT NULL,
      printer_port INT DEFAULT 9100,
      station_id VARCHAR(100) DEFAULT NULL,
      status ENUM('PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'FALHA') DEFAULT 'PENDENTE',
      tentativas INT DEFAULT 0,
      erro TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      finalizado_em TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE CASCADE,
      FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
    )
  `).catch(() => {});

  // --- MIGRAÇÃO DE TABELAS ISOLADAS ---
  try {
    const [evs] = await db.query('SELECT id FROM eventos');
    for (const ev of evs) {
      const { convTable, logsTable } = getEventTablesList(ev.id);
      await addColumn(convTable, 'email', "VARCHAR(255) DEFAULT NULL");
      await addColumn(convTable, 'telefone', "VARCHAR(20) DEFAULT NULL");
      await addColumn(convTable, 'cargo', "VARCHAR(100) DEFAULT NULL");
      await addColumn(convTable, 'empresa', "VARCHAR(100) DEFAULT NULL");
      await addColumn(convTable, 'face_descriptor', "TEXT DEFAULT NULL");
      await addColumn(convTable, 'observacoes', "TEXT DEFAULT NULL");
      await addColumn(convTable, 'tags', "TEXT DEFAULT NULL");
    }
    console.log(`✅ ${evs.length} tabelas isoladas verificadas/migradas.`);
  } catch (err) { console.error('Erro na migração de tabelas isoladas:', err.message); }

  // --- NOVAS INFRAESTRUTURAS v8.0 ---

  // 🔑 API Keys para Totens/Kiosks
  await db.query(`
    CREATE TABLE IF NOT EXISTS totem_api_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      evento_id INT NOT NULL,
      key_hash VARCHAR(64) NOT NULL UNIQUE,
      label VARCHAR(100) NOT NULL,
      ativo TINYINT(1) DEFAULT 1,
      ultimo_uso TIMESTAMP NULL DEFAULT NULL,
      expira_em TIMESTAMP NULL DEFAULT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_key_hash (key_hash),
      INDEX idx_evento_ativo (evento_id, ativo)
    )
  `).catch(() => {});

  // 🔔 Webhooks B2B — Subscriptions
  await db.query(`
    CREATE TABLE IF NOT EXISTS webhook_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      evento_id INT NOT NULL,
      url VARCHAR(500) NOT NULL,
      secret VARCHAR(64) NOT NULL,
      eventos JSON NOT NULL,
      ativo TINYINT(1) DEFAULT 1,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_evento_ativo (evento_id, ativo)
    )
  `).catch(() => {});

  // 🔔 Webhooks B2B — Histórico de Entregas
  await db.query(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subscription_id INT NOT NULL,
      status ENUM('PENDENTE','ENTREGUE','FALHA') DEFAULT 'PENDENTE',
      http_status INT DEFAULT NULL,
      tentativas INT DEFAULT 1,
      payload TEXT,
      resposta TEXT,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_subscription (subscription_id),
      INDEX idx_status (status)
    )
  `).catch(() => {});

  console.log('✅ Infraestrutura v8.0 migrada: API Keys, Webhooks.');
};

/**
 * MOTOR DE ISOLAMENTO: Cria tabelas dedicadas para um evento específico
 */
export const initEventTables = async (eventoId) => {
  const evID = parseInt(eventoId);
  const convTable = `convidados_ev${evID}`;
  const logsTable = `checkin_logs_ev${evID}`;

  // Criar Tabela de Convidados Isolada
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${convTable} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      evento_id INT DEFAULT ?,
      nome VARCHAR(255) NOT NULL,
      cpf VARCHAR(14),
      telefone VARCHAR(20),
      email VARCHAR(255),
      categoria VARCHAR(100),
      qrcode VARCHAR(100),
      tipo_entrada VARCHAR(50),
      status_checkin TINYINT(1) DEFAULT 0,
      data_entrada DATETIME,
      cargo VARCHAR(100) DEFAULT NULL,
      empresa VARCHAR(100) DEFAULT NULL,
      face_descriptor TEXT,
      observacoes TEXT DEFAULT NULL,
      tags TEXT DEFAULT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_qrcode (qrcode),
      INDEX idx_cpf (cpf),
      INDEX idx_status (status_checkin)
    )
  `, [evID]).catch(e => console.error(`Erro ao criar ${convTable}:`, e.message));

  // Criar Tabela de Logs Isolada
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${logsTable} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      convidado_id INT NOT NULL,
      evento_id INT DEFAULT ?,
      usuario_id INT DEFAULT ?,
      data_ponto DATE NOT NULL,
      station_id VARCHAR(100) DEFAULT NULL,
      assinatura_hash VARCHAR(128) DEFAULT NULL,
      ip VARCHAR(45) DEFAULT NULL,
      is_suspicious TINYINT(1) DEFAULT 0,
      checkin_photo LONGTEXT DEFAULT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY (convidado_id, data_ponto)
    )
  `, [evID, null]).catch(e => console.error(`Erro ao criar ${logsTable}:`, e.message));

  return { convTable, logsTable };
};

// Regex de validação para nomes de tabela gerados dinamicamente
const VALID_TABLE_REGEX = /^(convidados_ev|checkin_logs_ev)\d+$/;

/**
 * Valida se um nome de tabela dinâmico é seguro para uso em queries.
 * Lança erro se o nome não corresponder ao padrão esperado.
 */
export const validateTableName = (tableName) => {
  if (!tableName || !VALID_TABLE_REGEX.test(tableName)) {
    throw new Error(`[SECURITY] Nome de tabela inválido ou suspeito bloqueado: "${tableName}"`);
  }
  return tableName;
};

/**
 * Retorna os nomes das tabelas sem criá-las.
 * Lança erro se eventoId for inválido (NaN, negativo, não-numérico).
 */
export const getEventTablesList = (eventoId) => {
  const id = parseInt(eventoId);
  if (isNaN(id) || id <= 0) {
    throw new Error(`[SECURITY] eventoId inválido recebido: "${eventoId}" — operação abortada.`);
  }
  const convTable = `convidados_ev${id}`;
  const logsTable = `checkin_logs_ev${id}`;
  // Validação defensiva: garante que nomes gerados correspondem ao padrão esperado
  validateTableName(convTable);
  validateTableName(logsTable);
  return { convTable, logsTable };
};

export const registrarLog = async (usuarioId, acao, detalhes, ip, userAgent = null) => {
  try {
    const uID = usuarioId || null;
    
    // 🕵️‍♂️ HEURÍSTICA FORENSE (Detecção de Anomalias)
    const { isSuspicious, score } = await checkFraudHeuristics('ACTION', { ip }, db);

    // 🔐 GERA ASSINATURA DIGITAL (SHA-256)
    const secHash = generateSignature({ usuarioId: uID, acao, detalhes, ip, ts: Date.now() });

    await db.query(
      'INSERT INTO audit_logs (usuario_id, acao, detalhes, ip, user_agent, sec_hash, sec_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uID, acao, detalhes, ip, userAgent, secHash, score]
    );
  } catch (err) {
    console.error('🔥 [FORENSIC-LOG-ERRO]:', err.message);
  }
};

export default db;