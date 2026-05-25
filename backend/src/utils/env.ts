/**
 * Validação das variáveis de ambiente críticas.
 *
 * Importado uma única vez no boot do servidor (em `index.ts`). Se algo
 * estiver faltando ou inválido, o processo aborta com mensagem clara antes
 * de aceitar qualquer request — falhar cedo evita comportamento estranho
 * em produção (ex.: JWT_SECRET fraco, DATABASE_URL ausente).
 *
 * Use o objeto exportado `env` em qualquer parte do backend que precise de
 * configuração — em vez de `process.env.X` espalhado pelo código.
 */
import 'dotenv/config';
import logger from './logger';

export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  FRONTEND_URL: string;
  BCRYPT_ROUNDS: number;
  MAX_FILE_SIZE: number;
}

function obrigatoria(nome: string): string {
  const v = process.env[nome];
  if (!v || !v.trim()) {
    logger.fatal(`Variável de ambiente obrigatória ausente: ${nome}. Configure backend/.env`);
    process.exit(1);
  }
  return v;
}

function carregar(): AppEnv {
  const NODE_ENV = (process.env.NODE_ENV || 'development') as AppEnv['NODE_ENV'];
  const isProd = NODE_ENV === 'production';

  const DATABASE_URL = obrigatoria('DATABASE_URL');
  const FRONTEND_URL = obrigatoria('FRONTEND_URL');

  const JWT_SECRET = obrigatoria('JWT_SECRET');
  if (JWT_SECRET.length < 32) {
    logger.fatal(
      'JWT_SECRET muito curto (mínimo 32 caracteres). ' +
      'Gere com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
    process.exit(1);
  }
  if (isProd && /troque|change|secret|exemplo|example|default/i.test(JWT_SECRET)) {
    logger.fatal('JWT_SECRET aparenta ser o valor de exemplo. Gere um valor aleatório forte antes do deploy.');
    process.exit(1);
  }

  // Bcrypt rounds: cada +1 dobra o custo de hash.
  //   10 → ~100ms (default dev)
  //   12 → ~400ms (recomendado prod)
  const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || (isProd ? 12 : 10);
  if (BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 15) {
    logger.fatal(`BCRYPT_ROUNDS fora da faixa segura (10-15). Valor recebido: ${BCRYPT_ROUNDS}`);
    process.exit(1);
  }

  return {
    NODE_ENV,
    PORT: Number(process.env.PORT) || 3001,
    DATABASE_URL,
    JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    FRONTEND_URL,
    BCRYPT_ROUNDS,
    MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  };
}

export const env: AppEnv = carregar();
