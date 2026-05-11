import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import path from 'path';
import crypto from 'crypto';

import logger from './utils/logger';
import authRoutes from './routes/auth';
import orcamentosRoutes from './routes/orcamentos';
import produtosRoutes from './routes/produtos';
import categoriasRoutes from './routes/categorias';
import adminRoutes from './routes/admin';
import producaoRoutes from './routes/producao';

// Aborta logo se segredo JWT não estiver corretamente configurado
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  logger.fatal('JWT_SECRET ausente ou curto demais (mínimo 16 caracteres). Configure backend/.env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Log estruturado de cada request
app.use(pinoHttp({
  logger,
  genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Limite global de requisições — protege contra abuso geral
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve imagens de uploads estaticamente
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/producao', producaoRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'SM Unitur API running' });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler global — evita vazar stack em produção
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
  // pino-http enriquece req.log com o requestId; usamos para correlação
  const log = (req as Request & { log?: typeof logger }).log ?? logger;
  log.error({ err, code: err.code }, 'erro tratado');

  // Multer e outras libs costumam usar err.code
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Arquivo excede o tamanho permitido' });
  }

  const status = err.status ?? 500;
  const body: Record<string, unknown> = { error: status >= 500 ? 'Erro interno do servidor' : err.message };
  if (!isProd && status >= 500) body.detail = err.message;
  return res.status(status).json(body);
});

app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'API iniciada');
});

export default app;
