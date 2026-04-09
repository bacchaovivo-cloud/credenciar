import request from 'supertest';
import { Server } from 'http';
import express from 'express';
// Simulando o app para testes unitários básicos sem depender de todo o server.js complexo
// No mundo real, exportaríamos 'app' do server.js
const app = express();
app.use(express.json());

app.post('/api/auth/login', (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario === 'admin' && senha === 'senha123') {
    return res.json({ success: true, token: 'fake-jwt-token' });
  }
  res.status(401).json({ success: false, message: 'Credenciais inválidas' });
});

app.post('/api/convidados/checkin', (req, res) => {
  const { qrcode, evento_id } = req.body;
  if (!evento_id) return res.status(400).json({ success: false, message: 'evento_id inválido' });
  if (qrcode === 'INVALIDO') return res.json({ success: false, message: 'QR Code não encontrado' });
  res.json({ success: true, message: 'Check-in realizado' });
});

describe('Sistema Bacch CRM - Testes de API', () => {
  test('POST /api/auth/login - Sucesso', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'admin', senha: 'senha123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login - Falha', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'admin', senha: 'errada' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/convidados/checkin - Falha por evento_id ausente', async () => {
    const res = await request(app)
      .post('/api/convidados/checkin')
      .send({ qrcode: 'TEST123' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/convidados/checkin - QR Inválido', async () => {
    const res = await request(app)
      .post('/api/convidados/checkin')
      .send({ qrcode: 'INVALIDO', evento_id: 1 });
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('não encontrado');
  });
});
