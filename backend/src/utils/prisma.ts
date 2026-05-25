/**
 * Instância única do Prisma Client.
 *
 * Em desenvolvimento com hot-reload (ts-node-dev), evitamos abrir conexões
 * novas a cada respawn guardando a instância em `globalThis`.
 *
 * `registrarShutdownPrisma()` é chamado por `index.ts` para fechar a pool
 * limpamente quando o processo recebe SIGTERM/SIGINT (ex.: docker stop,
 * pm2 reload). Sem isso, conexões zumbis ficam abertas no MySQL.
 */
import { PrismaClient } from '@prisma/client';
import logger from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma =
  globalThis.__prisma ??
  new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

let shutdownRegistrado = false;

export function registrarShutdownPrisma() {
  if (shutdownRegistrado) return;
  shutdownRegistrado = true;

  const fechar = async (sinal: string) => {
    logger.info({ sinal }, 'shutdown: desconectando Prisma');
    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.error({ err }, 'shutdown: falha ao desconectar Prisma');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => fechar('SIGTERM'));
  process.on('SIGINT', () => fechar('SIGINT'));
}

export default prisma;
