/**
 * Bootstrap do servidor Express — API SM Unitur.
 * --------------------------------------------------------------------------
 * Ordem de inicialização:
 *   1. Carrega e valida variáveis de ambiente (`utils/env`) — aborta cedo
 *      se algo essencial estiver faltando/inválido.
 *   2. Configura middlewares globais: log estruturado, helmet, CORS,
 *      rate limit, parsers, serve estático de uploads.
 *   3. Monta rotas /api/*.
 *   4. Healthcheck que também testa a conexão com o banco.
 *   5. Handler global de erros (não vaza stack em produção).
 *   6. Registra shutdown limpo do Prisma (SIGTERM/SIGINT).
 */
import { env } from './utils/env'; // PRIMEIRO import — valida env no boot

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import path from 'path';
import crypto from 'crypto';

import logger from './utils/logger';
import prisma, { registrarShutdownPrisma } from './utils/prisma';

import authRoutes from './routes/auth';
import orcamentosRoutes from './routes/orcamentos';
import modelosRoutes from './routes/modelos';
import linhasRoutes from './routes/linhas';
import especificacoesRoutes from './routes/especificacoes';
import adminRoutes from './routes/admin';
import producaoRoutes from './routes/producao';

const app = express();
const isProd = env.NODE_ENV === 'production';

// Necessário para `express-rate-limit` quando estamos atrás de Nginx/Cloudflare
// — confia no primeiro proxy para ler o IP real do cliente.
app.set('trust proxy', 1);

app.use(pinoHttp({
  logger,
  genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));

app.use(helmet({
  // Imagens de /uploads são consumidas por outro origin (frontend) — sem
  // isso o navegador bloquearia por COEP/CORP.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limit global — protege contra abuso em endpoints públicos.
// Login tem rate limit adicional mais agressivo em `routes/auth`.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Servir imagens de uploads. Em produção, considere mover para Nginx (mais
// rápido + menos carga no Node) ou para um bucket externo.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

app.use('/api/auth', authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/modelos', modelosRoutes);
app.use('/api/linhas', linhasRoutes);
app.use('/api/especificacoes', especificacoesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/producao', producaoRoutes);

/**
 * Healthcheck completo: API responde E o banco responde.
 * Usado pelo orquestrador (Nginx/PM2/Docker/monitor externo) para saber
 * se vale a pena rotear tráfego para esta instância.
 */
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    logger.error({ err }, 'healthcheck: DB indisponível');
    return res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler global — evita vazar stack em produção.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; code?: string }, req: Request, res: Response, _next: NextFunction) => {
  const log = (req as Request & { log?: typeof logger }).log ?? logger;
  log.error({ err, code: err.code }, 'erro tratado');

  // Erros conhecidos do multer ganham mensagem amigável.
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Arquivo excede o tamanho permitido (máx. 10 MB).' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Campo de arquivo inesperado.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Número máximo de arquivos excedido.' });
  }

  const status = err.status ?? 500;
  const body: Record<string, unknown> = { error: status >= 500 ? 'Erro interno do servidor' : err.message };
  if (!isProd && status >= 500) body.detail = err.message;
  return res.status(status).json(body);
});

registrarShutdownPrisma();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API iniciada');
});

export default app;
