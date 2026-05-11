import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ─── Usuário admin padrão ─────────────────────────────
  const adminEmail = 'admin@smunitur.com.br';
  const existente = await prisma.usuarioAdmin.findUnique({ where: { email: adminEmail } });

  if (!existente) {
    const senha = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(senha, 10);
    await prisma.usuarioAdmin.create({
      data: {
        nome: 'Administrador',
        email: adminEmail,
        senha: hash,
        nivel: 'super_admin',
      },
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] Usuário admin criado: ${adminEmail} (senha: ${senha})`);
    // eslint-disable-next-line no-console
    console.log('[seed] ⚠️  Troque a senha imediatamente após o primeiro login!');
  } else {
    // eslint-disable-next-line no-console
    console.log('[seed] Usuário admin já existe — pulando.');
  }

  // ─── Categorias iniciais ──────────────────────────────
  const categorias = [
    { nome: 'Camisetas', slug: 'camisetas' },
    { nome: 'Moletons',  slug: 'moletons'  },
    { nome: 'Jalecos',   slug: 'jalecos'   },
  ];

  for (const c of categorias) {
    await prisma.categoria.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`[seed] ${categorias.length} categorias garantidas.`);
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
