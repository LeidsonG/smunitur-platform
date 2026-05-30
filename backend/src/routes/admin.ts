/**
 * Rotas de administração (/api/admin)
 * --------------------------------------------------------------------------
 * - GET /dashboard               → todos os admins logados
 * - CRUD /usuarios               → super_admin (admin lê listagem)
 *
 * Regras de segurança importantes:
 *   - O último super_admin ativo não pode ser despromovido, desativado ou
 *     excluído (impede lockout do sistema).
 *   - Nenhum usuário consegue desativar/excluir a si mesmo.
 *   - Trocar senha ou desativar incrementa `tokenVersion`, invalidando
 *     tokens JWT já emitidos.
 */
import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { env } from '../utils/env';
import { authMiddleware, requireNivel, AuthRequest } from '../middleware/auth';

const router = Router();

// Quantos super_admins ativos existem (usado para impedir lock-out)
async function countSuperAdminsAtivos(excetoId?: number): Promise<number> {
  return prisma.usuarioAdmin.count({
    where: {
      nivel: 'super_admin',
      ativo: true,
      ...(excetoId ? { NOT: { id: excetoId } } : {}),
    },
  });
}

// GET /api/admin/dashboard — estatísticas gerais
router.get('/dashboard', authMiddleware, async (_req: AuthRequest, res: Response) => {
  // Início do período: 1º dia do mês, 11 meses atrás (= 12 meses no total)
  const inicioJanela = new Date();
  inicioJanela.setDate(1);
  inicioJanela.setHours(0, 0, 0, 0);
  inicioJanela.setMonth(inicioJanela.getMonth() - 11);

  const [
    totalOrcamentos,
    orcamentosRecebidos,
    orcamentosEmProducao,
    orcamentosFinalizados,
    totalModelos,
    porMesRaw,
    ultimosOrcamentos,
  ] = await Promise.all([
    prisma.orcamento.count(),
    prisma.orcamento.count({ where: { status: 'recebido' } }),
    prisma.orcamento.count({ where: { status: 'em_producao' } }),
    prisma.orcamento.count({ where: { status: 'finalizado' } }),
    prisma.modelo.count({ where: { ativo: true } }),
    prisma.$queryRaw<{ mes: string; total: bigint }[]>`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes, COUNT(*) AS total
      FROM orcamentos
      WHERE created_at >= ${inicioJanela}
      GROUP BY mes
      ORDER BY mes ASC
    `,
    prisma.orcamento.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { numero: true, nomeCliente: true, modeloDesejado: true, status: true, createdAt: true },
    }),
  ]);

  // Preenche todos os 12 meses (inclusive os que não têm orçamentos)
  const porMesMap = new Map(porMesRaw.map(r => [r.mes, Number(r.total)]));
  const orcamentosPorMes: { mes: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    orcamentosPorMes.push({ mes: chave, total: porMesMap.get(chave) ?? 0 });
  }

  return res.json({
    stats: {
      totalOrcamentos,
      orcamentosRecebidos,
      orcamentosEmProducao,
      orcamentosFinalizados,
      totalModelos,
    },
    orcamentosPorMes,
    ultimosOrcamentos,
  });
});

// GET /api/admin/usuarios
router.get(
  '/usuarios',
  authMiddleware,
  requireNivel(['super_admin', 'admin']),
  async (_req: AuthRequest, res: Response) => {
    const usuarios = await prisma.usuarioAdmin.findMany({
      select: { id: true, nome: true, email: true, nivel: true, ativo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ usuarios });
  }
);

// POST /api/admin/usuarios — cria novo usuário
router.post(
  '/usuarios',
  authMiddleware,
  requireNivel(['super_admin']),
  [
    body('nome').trim().notEmpty().withMessage('Nome obrigatório').isLength({ max: 100 }),
    body('email').isEmail().withMessage('E-mail inválido').normalizeEmail(),
    body('senha')
      .isLength({ min: 8 }).withMessage('Senha precisa ter ao menos 8 caracteres')
      .matches(/[A-Za-z]/).withMessage('Senha precisa conter letra')
      .matches(/[0-9]/).withMessage('Senha precisa conter número'),
    body('nivel').isIn(['super_admin', 'admin', 'operador']).withMessage('Nível inválido'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome, email, senha, nivel } = req.body;

    const existente = await prisma.usuarioAdmin.findUnique({ where: { email } });
    if (existente) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(senha, env.BCRYPT_ROUNDS);

    const usuario = await prisma.usuarioAdmin.create({
      data: { nome, email, senha: hash, nivel },
      select: { id: true, nome: true, email: true, nivel: true, ativo: true, createdAt: true },
    });

    return res.status(201).json({ usuario });
  }
);

// PUT /api/admin/usuarios/:id — atualiza nome / e-mail / nível
router.put(
  '/usuarios/:id',
  authMiddleware,
  requireNivel(['super_admin']),
  [
    body('nome').optional().trim().notEmpty().isLength({ max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('nivel').optional().isIn(['super_admin', 'admin', 'operador']),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const alvo = await prisma.usuarioAdmin.findUnique({ where: { id } });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { nome, email, nivel } = req.body;

    // Se for despromover o próprio super_admin, precisa garantir que ainda sobrarão outros
    if (
      nivel && nivel !== 'super_admin' &&
      alvo.nivel === 'super_admin' && alvo.ativo
    ) {
      const restantes = await countSuperAdminsAtivos(alvo.id);
      if (restantes === 0) {
        return res.status(400).json({ error: 'Não é possível remover o último super_admin do sistema' });
      }
    }

    // Verifica conflito de e-mail
    if (email && email !== alvo.email) {
      const conflito = await prisma.usuarioAdmin.findUnique({ where: { email } });
      if (conflito) return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const atualizado = await prisma.usuarioAdmin.update({
      where: { id },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(nivel !== undefined ? { nivel } : {}),
      },
      select: { id: true, nome: true, email: true, nivel: true, ativo: true, createdAt: true },
    });

    return res.json({ usuario: atualizado });
  }
);

// PATCH /api/admin/usuarios/:id/senha — super_admin redefine senha de outro
router.patch(
  '/usuarios/:id/senha',
  authMiddleware,
  requireNivel(['super_admin']),
  [
    body('novaSenha')
      .isLength({ min: 8 }).withMessage('Senha precisa ter ao menos 8 caracteres')
      .matches(/[A-Za-z]/).withMessage('Senha precisa conter letra')
      .matches(/[0-9]/).withMessage('Senha precisa conter número'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const alvo = await prisma.usuarioAdmin.findUnique({ where: { id } });
    if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });

    const hash = await bcrypt.hash(req.body.novaSenha, env.BCRYPT_ROUNDS);
    // Incrementa tokenVersion para forçar logout em todas as sessões abertas
    // do usuário-alvo (caso o admin esteja "expulsando" alguém comprometido).
    await prisma.usuarioAdmin.update({
      where: { id },
      data: { senha: hash, tokenVersion: { increment: 1 } },
    });

    return res.json({ message: 'Senha redefinida com sucesso' });
  }
);

// PATCH /api/admin/usuarios/:id/toggle — ativa/desativa
router.patch(
  '/usuarios/:id/toggle',
  authMiddleware,
  requireNivel(['super_admin']),
  async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    if (id === req.admin!.id) {
      return res.status(400).json({ error: 'Você não pode desativar a si mesmo' });
    }

    const usuario = await prisma.usuarioAdmin.findUnique({ where: { id } });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Se vai DESativar e o alvo for super_admin, garantir que sobrará ao menos um
    if (usuario.ativo && usuario.nivel === 'super_admin') {
      const restantes = await countSuperAdminsAtivos(usuario.id);
      if (restantes === 0) {
        return res.status(400).json({ error: 'Não é possível desativar o último super_admin' });
      }
    }

    // Ao desativar, incrementa tokenVersion para invalidar tokens vivos.
    // Ao reativar, mantém — usuário precisará fazer login normalmente.
    const atualizado = await prisma.usuarioAdmin.update({
      where: { id },
      data: {
        ativo: !usuario.ativo,
        ...(usuario.ativo ? { tokenVersion: { increment: 1 } } : {}),
      },
      select: { id: true, nome: true, email: true, nivel: true, ativo: true },
    });

    return res.json({ usuario: atualizado });
  }
);

// DELETE /api/admin/usuarios/:id — exclui usuário
router.delete(
  '/usuarios/:id',
  authMiddleware,
  requireNivel(['super_admin']),
  async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    if (id === req.admin!.id) {
      return res.status(400).json({ error: 'Você não pode excluir a si mesmo' });
    }

    const usuario = await prisma.usuarioAdmin.findUnique({ where: { id } });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (usuario.nivel === 'super_admin') {
      const restantes = await countSuperAdminsAtivos(usuario.id);
      if (restantes === 0) {
        return res.status(400).json({ error: 'Não é possível excluir o último super_admin' });
      }
    }

    await prisma.usuarioAdmin.delete({ where: { id } });
    return res.json({ message: 'Usuário excluído com sucesso' });
  }
);

export default router;
