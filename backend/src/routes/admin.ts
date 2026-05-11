import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
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
  const [
    totalOrcamentos,
    orcamentosRecebidos,
    orcamentosEmProducao,
    orcamentosFinalizados,
    totalProdutos,
  ] = await Promise.all([
    prisma.orcamento.count(),
    prisma.orcamento.count({ where: { status: 'recebido' } }),
    prisma.orcamento.count({ where: { status: 'em_producao' } }),
    prisma.orcamento.count({ where: { status: 'finalizado' } }),
    prisma.produto.count({ where: { ativo: true } }),
  ]);

  const ultimosOrcamentos = await prisma.orcamento.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      numero: true, nomeCliente: true, produtoDesejado: true, status: true, createdAt: true,
    },
  });

  return res.json({
    stats: {
      totalOrcamentos,
      orcamentosRecebidos,
      orcamentosEmProducao,
      orcamentosFinalizados,
      totalProdutos,
    },
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

    const hash = await bcrypt.hash(senha, 10);

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

    const hash = await bcrypt.hash(req.body.novaSenha, 10);
    await prisma.usuarioAdmin.update({ where: { id }, data: { senha: hash } });

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

    const atualizado = await prisma.usuarioAdmin.update({
      where: { id },
      data: { ativo: !usuario.ativo },
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
