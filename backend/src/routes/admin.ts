import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authMiddleware, requireNivel, AuthRequest } from '../middleware/auth';

const router = Router();

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
  async (_req: Request, res: Response) => {
    const usuarios = await prisma.usuarioAdmin.findMany({
      select: { id: true, nome: true, email: true, nivel: true, ativo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ usuarios });
  }
);

// POST /api/admin/usuarios
router.post(
  '/usuarios',
  authMiddleware,
  requireNivel(['super_admin']),
  [
    body('nome').trim().notEmpty(),
    body('email').isEmail(),
    body('senha').isLength({ min: 6 }).withMessage('Senha mínima de 6 caracteres'),
    body('nivel').isIn(['super_admin', 'admin', 'operador']),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome, email, senha, nivel } = req.body;
    const hash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuarioAdmin.create({
      data: { nome, email, senha: hash, nivel },
      select: { id: true, nome: true, email: true, nivel: true, createdAt: true },
    });

    return res.status(201).json({ usuario });
  }
);

// PATCH /api/admin/usuarios/:id/toggle — ativa/desativa
router.patch(
  '/usuarios/:id/toggle',
  authMiddleware,
  requireNivel(['super_admin']),
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const usuario = await prisma.usuarioAdmin.findUnique({ where: { id } });
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });

    const atualizado = await prisma.usuarioAdmin.update({
      where: { id },
      data: { ativo: !usuario.ativo },
      select: { id: true, nome: true, email: true, nivel: true, ativo: true },
    });

    return res.json({ usuario: atualizado });
  }
);

export default router;
