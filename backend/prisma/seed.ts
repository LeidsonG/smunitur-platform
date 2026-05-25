/**
 * Seed do banco: garante que existe um super_admin inicial.
 * Linhas e modelos são cadastrados pelo painel admin em /admin/linhas.
 *
 * Em produção, sempre informe `SEED_ADMIN_PASSWORD` no ambiente — o fallback
 * `admin123` é apenas para desenvolvimento local.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

async function main() {
  // ─── Usuário admin padrão ─────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@smunitur.com.br';
  const existente = await prisma.usuarioAdmin.findUnique({ where: { email: adminEmail } });

  if (!existente) {
    const senha = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(senha, BCRYPT_ROUNDS);
    await prisma.usuarioAdmin.create({
      data: {
        nome: 'Administrador',
        email: adminEmail,
        senha: hash,
        nivel: 'super_admin',
      },
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] Usuário admin criado: ${adminEmail}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      // eslint-disable-next-line no-console
      console.log('[seed] AVISO: usando senha padrão "admin123" — TROQUE imediatamente.');
    }
  } else {
    // eslint-disable-next-line no-console
    console.log('[seed] Usuário admin já existe — pulando.');
  }

  // ─── Linhas ───────────────────────────────────────────
  // Nenhuma linha pré-definida — cadastre pelo painel admin em /admin/linhas.
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[seed] Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
