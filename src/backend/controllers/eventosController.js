import { EventoService } from '../services/eventoService.js';
import { eventoSchema } from '../validations/schemas.js';
import { Logger } from '../utils/logger.js';
import db from '../config/db.js';

// Importações de Segurança para os Uploads
import { fileTypeFromFile } from 'file-type';
import fs from 'fs';

/**
 * 👑 EVENTOS CONTROLLER (Enterprise Refactored)
 */

// 🔒 CORREÇÃO CRÍTICA: Rota pública que não vaza configurações ou dados sensíveis
export const getPublicEvents = async (req, res) => {
  try {
    // Busca direto no banco apenas os campos necessários para vitrine/venda.
    // Adapte o "status" conforme as regras de negócio do seu banco (ex: 'ATIVO').
    const [rows] = await db.query(
      'SELECT id, nome, data, local, logo_url, background_url FROM eventos ORDER BY data ASC'
    );
    res.json({ success: true, dados: rows });
  } catch (error) {
    Logger.error('Erro ao listar eventos públicos:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao buscar eventos.' });
  }
};

export const getEventos = async (req, res) => {
  try {
    const dados = await EventoService.listarTodos();
    res.json({ success: true, dados });
  } catch (error) {
    Logger.error('Erro ao listar eventos:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao buscar eventos' });
  }
};

export const getEventoById = async (req, res) => {
  const { id } = req.params;
  try {
    const dados = await EventoService.buscarPorId(id);
    res.json({ success: true, dados });
  } catch (error) {
    Logger.error(`Erro ao buscar evento ${id}:`, error);
    res.status(404).json({ success: false, message: error.message });
  }
};

export const createEvento = async (req, res) => {
  try {
    const validatedData = eventoSchema.parse(req.body);
    const novoEvento = await EventoService.criar(validatedData);
    res.json({ success: true, message: 'Evento criado com sucesso!', id: novoEvento.id });
  } catch (error) {
    Logger.error('Erro na criação de evento:', error);
    res.status(400).json({ success: false, message: error.message || 'Dados inválidos' });
  }
};

export const updateEvento = async (req, res) => {
  const { id } = req.params;
  try {
    // Fix #1: Validação Zod Parcial para garantir integridade no update
    const data = eventoSchema.partial().parse(req.body);
    const atualizado = await EventoService.atualizar(id, data);
    res.json({ success: true, message: 'Evento atualizado com sucesso!', dados: atualizado });
  } catch (error) {
    Logger.error(`Erro no update do evento ${id}:`, error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteEvento = async (req, res) => {
  const { id } = req.params;
  try {
    await EventoService.excluir(id);
    res.json({ success: true, message: 'Evento removido com sucesso!' });
  } catch (error) {
    Logger.error(`Erro ao deletar evento ${id}:`, error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- MÉTODOS DE SUPORTE (Retrocompatibilidade e Auxiliares) ---

export const getSetores = async (req, res) => {
  const [rows] = await db.query('SELECT * FROM setores_evento WHERE evento_id = ? ORDER BY id ASC', [req.params.id]);
  res.json({ success: true, dados: rows });
};

export const addSetor = async (req, res) => {
  const { nome, icone, cor, capacidade } = req.body;
  await db.query('INSERT INTO setores_evento (evento_id, nome, icone, cor, capacidade) VALUES (?, ?, ?, ?, ?)',
    [req.params.id, nome, icone || '🏷️', cor || '#0ea5e9', capacidade || 0]);
  res.json({ success: true });
};

export const deleteSetor = async (req, res) => {
  await db.query('DELETE FROM setores_evento WHERE id = ? AND evento_id = ?', [req.params.setorId, req.params.id]);
  res.json({ success: true });
};

export const uploadLogo = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });

  const filePath = req.file.path;

  // 🔒 CORREÇÃO MÉDIA: Validação real do conteúdo do arquivo (Magic Bytes)
  const meta = await fileTypeFromFile(filePath);
  if (!meta || !meta.mime.startsWith('image/')) {
    fs.unlinkSync(filePath); // Exclui o script malicioso disfarçado de imagem do disco
    return res.status(400).json({ success: false, message: 'Arquivo malicioso ou formato inválido detectado.' });
  }

  const logoUrl = `/uploads/events/${req.file.filename}`;
  await db.query('UPDATE eventos SET logo_url = ? WHERE id = ?', [logoUrl, id]);
  res.json({ success: true, url: logoUrl });
};

export const uploadBackground = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });

  const filePath = req.file.path;

  // 🔒 CORREÇÃO MÉDIA: Validação real do conteúdo do arquivo (Magic Bytes)
  const meta = await fileTypeFromFile(filePath);
  if (!meta || !meta.mime.startsWith('image/')) {
    fs.unlinkSync(filePath); // Exclui o arquivo falso
    return res.status(400).json({ success: false, message: 'Arquivo malicioso ou formato inválido detectado.' });
  }

  const bgUrl = `/uploads/events/${req.file.filename}`;
  await db.query('UPDATE eventos SET background_url = ? WHERE id = ?', [bgUrl, id]);
  res.json({ success: true, url: bgUrl });
};

export const getLabelConfig = async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.query('SELECT label_template_json FROM eventos WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ success: false, message: 'Evento não encontrado' });
  
  let config = rows[0].label_template_json;
  if (typeof config === 'string') config = JSON.parse(config);
  
  res.json({ success: true, dados: config });
};

export const updateLabelConfig = async (req, res) => {
  const { id } = req.params;
  const config = JSON.stringify(req.body);
  await db.query('UPDATE eventos SET label_template_json = ? WHERE id = ?', [config, id]);
  res.json({ success: true, message: 'Configuração de etiqueta persistida!' });
};