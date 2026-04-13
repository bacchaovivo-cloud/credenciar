import net from 'net';
import db from '../config/db.js';
import { Jimp } from 'jimp';
import { CircuitBreaker } from '../utils/circuitBreaker.js';
import { AlertService } from './alertService.js';
import { env } from '../config/env.js';

/**
 * Brother QL-820NWB ESC/P & P-touch Template Service
 * Agora com sistema de FILA PERSISTENTE para alta concorrência.
 */
export const BrotherService = {
  
  validateTarget(ip, port) {
    if (env.PRINTER_MODE === 'fake' && (ip || '').startsWith('99.99')) return;
    const SAFE_PRINTER = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/;
    const p = parseInt(port, 10) || 9100;
    if (!SAFE_PRINTER.test(ip) || ![9100, 9101, 515].includes(p)) {
      throw new Error('IP/porta de impressora não permitido');
    }
  },

  // Mapa para controlar workers ativos por IP
  workersByIp: new Map(),
  // Circuit Breakers por IP de impressora — previne loop de falhas em cascata
  circuitsByIp: new Map(),
  io: null,

  setIo(io) {
    this.io = io;
  },

  /**
   * Retorna ou cria um CircuitBreaker para o IP especificado.
   */
  getCircuit(ip) {
    if (!this.circuitsByIp.has(ip)) {
      const cb = new CircuitBreaker({
        name: `Printer-${ip}`,
        failureThreshold: 3,
        recoveryTimeout: 30000, // 30s antes de tentar de novo
        successThreshold: 1,
      });
      // Emite alerta Socket.IO quando o circuito abre
      cb.on('stateChange', ({ name, current, nextAttempt }) => {
        if (current === 'OPEN') {
          AlertService.hardwareOffline(this.io, {
            ip,
            port: 9100,
            error: { message: `CircuitBreaker aberto após 3 falhas consecutivas` },
            circuitState: current,
          });
        }
      });
      this.circuitsByIp.set(ip, cb);
    }
    return this.circuitsByIp.get(ip);
  },

  async emitStatus(eventoId) {
    if (!this.io) return;
    try {
      // Import dinâmico para evitar circular dependency se houver
      const { statusFilaInternal } = await import('../controllers/impressaoController.js');
      const stats = await statusFilaInternal(eventoId);
      this.io.emit('queue_update', { evento_id: eventoId, ...stats });
    } catch (e) { console.error("Erro ao emitir status da fila:", e); }
  },

  /**
   * Adiciona um trabalho à fila
   */
  async enqueue(participante, eventoId, printerIp, printerPort) {
    this.validateTarget(printerIp, printerPort);
    await db.query(
      'INSERT INTO print_jobs (convidado_id, evento_id, printer_ip, printer_port, status) VALUES (?, ?, ?, ?, ?)',
      [participante.id, eventoId, printerIp, printerPort, 'PENDENTE']
    );
    this.emitStatus(eventoId);
    this.startWorker(printerIp, printerPort);
  },

  /**
   * Inicia um worker isolado para uma impressora específica
   * Fix Fase3: Substituiu recursão infinita de setTimeout por loop while controlado
   */
  async startWorker(ip, port) {
    if (this.workersByIp.has(ip)) return;
    this.workersByIp.set(ip, true);
    
    console.log(`👷 Worker Iniciado para Impressora: ${ip}:${port}`);

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // Loop controlado — sem recursão, sem stack growth
    while (this.workersByIp.has(ip)) {
      try {
        // [ELITE-UPGRADE] Hardware Health Check antes de cada job
        const health = await this.getPrinterStatus(ip, port).catch(() => ({ status: 'OFFLINE' }));
        if (health.status !== 'READY' && health.status !== 'OFFLINE') {
           console.warn(`⚠️ ALERTA HARDWARE ${ip}: ${health.status}`);
           if (this.io) this.io.emit('hardware_alert', { ip, status: health.status, evento_id: null });
           await sleep(10000);
           continue;
        }

        const [jobs] = await db.query(
          `SELECT * FROM print_jobs WHERE status = 'PENDENTE' AND printer_ip = ? ORDER BY id ASC LIMIT 1`,
          [ip]
        );

        if (jobs.length === 0) {
           this.workersByIp.delete(ip);
           console.log(`😴 Worker em standby para IP: ${ip} (Fila vazia)`);
           break;
        }

        const job = jobs[0];

        // 🛡️ Bacch Data Isolation Engine
        const { getEventTablesList } = await import('../config/db.js');
        const { convTable } = getEventTablesList(job.evento_id);

        const [guests] = await db.query(
          `SELECT nome, qrcode, cargo, empresa, categoria, cpf, telefone, email, observacoes FROM ${convTable} WHERE id = ?`,
          [job.convidado_id]
        );

        if (guests.length > 0) {
           Object.assign(job, guests[0]);
        } else {
           await db.query('UPDATE print_jobs SET status = ?, erro = ? WHERE id = ?', ['FALHA', 'Participante inexistente (Data Isolation)', job.id]);
           await sleep(300);
           continue;
        }

        await db.query('UPDATE print_jobs SET status = ?, tentativas = tentativas + 1 WHERE id = ?', ['PROCESSANDO', job.id]);

        try {
          // Circuit Breaker protege printLabel — 3 falhas = circuito abre por 30s
          const circuit = this.getCircuit(ip);
          await circuit.fire(() => this.printLabel(ip, port, job));
          await db.query('UPDATE print_jobs SET status = ?, finalizado_em = NOW() WHERE id = ?', ['CONCLUIDO', job.id]);
          console.log(`✅ Sucesso: Etiqueta impressa em ${ip} para ${job.nome}`);
        } catch (err) {
          console.error(`❌ Falha na Impressora ${ip}: ${err.message}`);
          const isCircuitOpen = err.message?.includes('Circuito ABERTO');
          // Se o circuito está aberto, mover direto para FALHA sem novas tentativas
          const deveTentarNovamente = !isCircuitOpen && job.tentativas < 3;
          const novoStatus = deveTentarNovamente ? 'PENDENTE' : 'FALHA';
          await db.query('UPDATE print_jobs SET status = ?, erro = ? WHERE id = ?', [novoStatus, err.message, job.id]);
          await sleep(5000);
        }

        this.emitStatus(job.evento_id);
        await sleep(300);
      } catch (err) {
        console.error(`💥 Erro crítico no worker do IP ${ip}:`, err.message);
        this.workersByIp.delete(ip);
        break;
      }
    }
  },

  /**
   * Main entry point to print a label for a participant (Dynamic ESC/P)
   */
  async printLabel(host, port, data) {
    if (!host) throw new Error('IP da impressora não configurado.');

    // 🎨 [PHASE 23] BUSCA CONFIGURAÇÃO DE LAYOUT DO EVENTO
    const [evento] = await db.query('SELECT label_template_json, nome as evento_nome FROM eventos WHERE id = ?', [data.evento_id]);
    data.evento_nome = evento[0]?.evento_nome;
    let layout = null;
    try { if (evento[0]?.label_template_json) {
        layout = typeof evento[0].label_template_json === 'string' ? JSON.parse(evento[0].label_template_json) : evento[0].label_template_json;
    } } catch(e) {}

    const ESC = 0x1B;
    let commands = [];

    commands.push(0x00, 0x00, 0x00, ESC, 0x40); // Init
    commands.push(ESC, 0x69, 0x61, 0x00);        // ESC/P mode

    if (layout && Array.isArray(layout)) {
        // RENDERIZAÇÃO DINÂMICA BASEADA NO DESIGNER
        for (const field of layout) {
            if (!field.active) continue;

            // 📍 POSICIONAMENTO ABSOLUTO (Horizontal: ESC $ nL nH)
            const xDots = Math.round(field.x * 1.5);
            const nL = xDots % 256;
            const nH = Math.floor(xDots / 256);
            commands.push(ESC, 0x24, nL, nH); // Move X

            // 🎯 ALINHAMENTO (ESC a n)
            const alignMap = { left: 0, center: 1, right: 2 };
            const alignVal = alignMap[field.align] || 0;
            commands.push(ESC, 0x61, alignVal);

            // ✨ NEGRITO (ESC E n)
            commands.push(ESC, 0x45, field.bold ? 1 : 0);

            // ✍️ CONTEÚDO DO CAMPO
            let text = '';
            if (field.isStatic) {
                text = field.label;
            } else {
                if (field.id === 'nome') text = data.nome?.toUpperCase() || '';
                else if (field.id === 'evento_nome') text = data.evento_nome?.toUpperCase() || '';
                else if (field.id === 'cargo_empresa') text = `${data.cargo || ''} ${data.empresa || ''}`.trim();
                else if (field.id === 'categoria') text = data.categoria || '';
                else if (field.id === 'cargo') text = data.cargo || '';
                else if (field.id === 'empresa') text = data.empresa || '';
                else if (field.id === 'cpf') text = data.cpf || '';
                else if (field.id === 'telefone') text = data.telefone || '';
                else if (field.id === 'email') text = data.email || '';
                else if (field.id === 'observacoes') text = data.observacoes || '';
                else if (field.id === 'qr') {
                    // QR Code Setup
                    commands.push(ESC, 0x69, 0x51, 0x02, 0x02, 0x00, 0x00, 0x00);
                    commands.push(...Buffer.from(data.qrcode));
                    continue;
                }
            }

            if (text) {
                // Ajuste simples de tamanho de fonte baseado no designer
                // ESC X m n (Font Selection)
                const sizeCmd = field.size > 20 ? 0x31 : 0x30; 
                commands.push(ESC, 0x58, 0x00, sizeCmd, 0x00); 
                commands.push(...Buffer.from(text + '\n'));
            }

            // 🖼️ RENDERIZAÇÃO DE IMAGEM (LOGOS)
            if (field.isImage && field.content) {
                try {
                    const imgData = await this.prepareImageForEscP(field.content, field.size);
                    commands.push(...imgData);
                } catch(e) { console.error("Erro no processamento da imagem:", e); }
            }
            
            // Reset Negrito após o campo para não afetar o próximo se não definido
            commands.push(ESC, 0x46); 
        }
    } else {
        // Fix #19: Fallback inteligente — suporta formato Objeto legado E novo Array
        // Se o layout for um objeto simples (formato antigo), usa os campos diretamente
        commands.push(ESC, 0x45, 1); // Bold ON
        commands.push(ESC, 0x58, 0x00, 0x31, 0x00);
        commands.push(...Buffer.from(`\n${(data.nome || '').toUpperCase()}\n`));
        commands.push(ESC, 0x45, 0); // Bold OFF
        commands.push(ESC, 0x58, 0x00, 0x30, 0x00);
        if (data.cargo || data.empresa) commands.push(...Buffer.from(`${data.cargo || ''} - ${data.empresa || ''}\n`));
        if (data.categoria) commands.push(...Buffer.from(`------- ${data.categoria} -------\n`));
        // QR Code
        commands.push(ESC, 0x69, 0x51, 0x02, 0x02, 0x00, 0x00, 0x00);
        commands.push(...Buffer.from(data.qrcode));
    }

    commands.push(0x5c, 0x5c, 0x5c, 0x0C); // Terminator + FF
    const buffer = Buffer.from(commands);
    return this.sendToTcp(buffer, host, port);
  },

  async sendToTcp(data, host, port = 9100) {
    // MODO SIMULADO (Apenas para testes locais sem impressora)
    if (env.PRINTER_MODE === 'fake' || host.startsWith('99.99')) {
      return new Promise((resolve, reject) => {
        // Simulação de Impressora "Travada" (Stuck)
        if (host === '99.99.99.99') {
          console.log(`🐢 [PRINTER-STUCK] Simulando erro crítico INFINITO para ${host}`);
          return setTimeout(() => {
            reject(new Error('TIMEOUT CRÍTICO: Impressora parou de responder (Simulado)'));
          }, 15000); // 15 segundos de retenção
        }

        const delay = host.startsWith('99.99') ? 100 : 2500; // Delay realista de impressão
        console.log(`📡 [PRINTER-SIM] Simulando envio para ${host}:${port}...`);
        
        setTimeout(() => {
          console.log(`🖨️ [PRINTER-SIM] Comando Enviado: ${data.length} bytes p/ ${host}`);
          resolve(true);
        }, delay);
      });
    }

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(6000); 

      client.connect(port, host, () => {
        client.write(data);
        client.end();
        resolve(true);
      });

      client.on('error', (err) => {
        client.destroy();
        reject(new Error(`Erro de conexão (${err.code}): ${err.message}`));
      });

      client.on('timeout', () => {
        client.destroy();
        reject(new Error(`Timeout: Impressora ${host} não respondeu.`));
      });
    });
  },

  /**
   * Converte Base64 para Comandos Raster ESC/P (Brother Graphics Mode)
   */
  async prepareImageForEscP(base64, targetWidth) {
    const buffer = Buffer.from(base64.split(',')[1], 'base64');
    const image = await Jimp.read(buffer);
    
    // Redimensiona proporcionalmente (API Jimp v1.x usa objeto em resize)
    image.resize({ w: targetWidth });
    image.greyscale().contrast(0.6).blackWhite();

    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const bytesPerLine = Math.ceil(width / 8);
    const rasterLineCmd = [0x1B, 0x69, 0x67, 0x00, bytesPerLine, 0x00]; // ESC i g \0 nL \0
    
    let result = [];
    
    for (let y = 0; y < height; y++) {
        let line = Buffer.alloc(bytesPerLine, 0);
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // Se o pixel for preto (baseado no brilho), seta o bit
            const avg = (image.bitmap.data[idx] + image.bitmap.data[idx+1] + image.bitmap.data[idx+2]) / 3;
            if (avg < 128) {
                const byteIdx = Math.floor(x / 8);
                const bitIdx = 7 - (x % 8);
                line[byteIdx] |= (1 << bitIdx);
            }
        }
        result.push(...rasterLineCmd, ...line);
    }
    
    return result;
  },

  async testPrinter(ip, port) {
     this.validateTarget(ip, port);
     return this.sendToTcp(Buffer.from([0x1B, 0x40]), ip, port); 
  },

  /**
   * 🏥 HARDWARE DIAGNOSTICS: ESC i S
   * Retorna o status físico da impressora (Erro de Papel, Tampa, etc.)
   */
  async getPrinterStatus(host, port = 9100) {
    if (env.PRINTER_MODE === 'fake') {
        // Simulação aleatória de erros para teste do War Room
        const rand = Math.random();
        if (rand > 0.95) return { status: 'PAPER_OUT' };
        if (rand > 0.90) return { status: 'COVER_OPEN' };
        return { status: 'READY' };
    }

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(3000);
      
      client.connect(port, host, () => {
        client.write(Buffer.from([0x1B, 0x69, 0x53])); // ESC i S (Status Information)
      });

      client.on('data', (data) => {
        // O status da Brother retorna um buffer de 32 bytes
        // Byte 8: Error Info 1 (Out of Paper: bit 0)
        // Byte 9: Error Info 2 (Cover Open: bit 4)
        if (data.length >= 10) {
          const err1 = data[8];
          const err2 = data[9];
          
          if (err1 & 0x01) return resolve({ status: 'PAPER_OUT' });
          if (err2 & 0x10) return resolve({ status: 'COVER_OPEN' });
          
          resolve({ status: 'READY' });
        }
        client.end();
      });

      client.on('error', (err) => { client.destroy(); reject(err); });
      client.on('timeout', () => { client.destroy(); reject(new Error('Timeout')); });
    });
  }
};
