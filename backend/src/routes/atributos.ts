import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── Admin: CRUD de atributos ────────────────────────────────────────────────

router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const atributos = await prisma.atributoProduto.findMany({
    orderBy: [{ categoriaId: 'asc' }, { ordem: 'asc' }],
    include: {
      categoria: { select: { id: true, nome: true } },
      opcoes: { orderBy: { ordem: 'asc' } },
    },
  });
  return res.json({ atributos });
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { categoria_id, nome, obrigatorio = false, ordem = 0 } = req.body;
  if (!categoria_id || !nome) {
    return res.status(400).json({ error: 'categoria_id e nome são obrigatórios' });
  }
  const atributo = await prisma.atributoProduto.create({
    data: { categoriaId: parseInt(categoria_id), nome, obrigatorio, ordem },
    include: { opcoes: true },
  });
  return res.status(201).json({ atributo });
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { nome, obrigatorio, ordem, ativo } = req.body;
  const data: Record<string, unknown> = {};
  if (nome !== undefined) data.nome = nome;
  if (obrigatorio !== undefined) data.obrigatorio = obrigatorio;
  if (ordem !== undefined) data.ordem = ordem;
  if (ativo !== undefined) data.ativo = ativo;

  const atributo = await prisma.atributoProduto.update({ where: { id }, data });
  return res.json({ atributo });
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.atributoProduto.delete({ where: { id: parseInt(req.params.id) } });
  return res.json({ ok: true });
});

// ─── Admin: CRUD de opções ────────────────────────────────────────────────────

router.post('/:id/opcoes', authMiddleware, async (req: AuthRequest, res: Response) => {
  const atributoId = parseInt(req.params.id);
  const { valor, ordem = 0 } = req.body;
  if (!valor) return res.status(400).json({ error: 'valor é obrigatório' });

  const opcao = await prisma.opcaoAtributo.create({ data: { atributoId, valor, ordem } });
  return res.status(201).json({ opcao });
});

router.patch('/opcoes/:opcaoId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.opcaoId);
  const { valor, ordem, ativo } = req.body;
  const data: Record<string, unknown> = {};
  if (valor !== undefined) data.valor = valor;
  if (ordem !== undefined) data.ordem = ordem;
  if (ativo !== undefined) data.ativo = ativo;

  const opcao = await prisma.opcaoAtributo.update({ where: { id }, data });
  return res.json({ opcao });
});

router.delete('/opcoes/:opcaoId', authMiddleware, async (req: Request, res: Response) => {
  await prisma.opcaoAtributo.delete({ where: { id: parseInt(req.params.opcaoId) } });
  return res.json({ ok: true });
});

export default router;
