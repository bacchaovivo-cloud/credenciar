import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';


import { env } from './backend/config/env.js'; 
import db, { migrate } from './backend/config/db.js';
import apiRoutes from './backend/routes/index.js';
import { BrotherService } from './backend/services/brotherService.js';
import { errorHandler } from './backend/middlewares/errorHandler.js';
import { globalLimiter } from './backend/middlewares/rateLimiter.js';
import { Logger } from './backend/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// 🌐 CORS: Origens permitidas via variável de ambiente (nunca wildcard em produção)
const allowedOrigins = (env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3001').split(',').map(o => o.trim()).filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`[CORS-SOCKET] Origem bloqueada: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

// 🛡️ SECURITY HEADERS (Elite Hardening via Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "*"],
      "connect-src": ["'self'", "wss:", "https:", "http:"],
      "script-src": env.NODE_ENV === 'production' 
        ? ["'self'"] 
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      "style-src": ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Permite carregar recursos de diferentes origens sem headers strict COEP
}));


app.use(globalLimiter);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`[CORS] Origem não permitida: ${origin}`));
  },
  credentials: true
}));
// Fix: Limite reduzido de 50mb para 5mb — previne DoS via payload oversized
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

import { HealthService } from './backend/services/healthService.js';

// 🩺 HEALTH CHECK (Zenith Health Shield)
app.get('/health', async (req, res) => {
  try {
    const report = await HealthService.getFullReport();
    res.json(report);
  } catch (e) {
    res.status(500).json({ status: 'DOWN', message: e.message });
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
  if (!token) return next(new Error('Authentication error: No token provided'));
  
  jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.user = decoded;
    next();
  });
});

app.use('/api', apiRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Fix: usa env.NODE_ENV (validado pelo Zod) em vez de process.env.NODE_ENV direto
if (env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../dist', 'index.html')));
}

app.use(errorHandler);

import { HardwarePollingService } from './backend/services/hardwarePollingService.js';

// ... (existing code)

migrate().then(() => {
    BrotherService.setIo(io);
    HardwarePollingService.start(io);
});

const PORT = env.PORT || 3001;
httpServer.listen(PORT, () => {
    Logger.info('🚀 BACCH PRODUÇÕES v8.0 - FULL ENTERPRISE EVOLUTION', { 
        port: PORT, 
        mode: env.NODE_ENV,
        security: 'Environment Validated, JWT, RateLimit, Audit ACTIVE',
        observability: 'Structured JSON Logging ACTIVE'
    });
});