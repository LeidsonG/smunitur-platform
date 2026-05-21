import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const categorias = await prisma.categoria.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
  });
  return res.json({ categorias });
});

// GET /api/categorias/:id/atributos — público, retorna atributos + opções de uma categoria
router.get('/:id/atributos', async (req: Request, res: Response) => {
  const categoriaId = parseInt(req.params.id);
  if (isNaN(categoriaId)) return res.status(400).json({ error: 'ID inválido' });

  const atributos = await prisma.atributoProduto.findMany({
    where: { categoriaId, ativo: true },
    orderBy: { ordem: 'asc' },
    include: {
      opcoes: {
        where: { ativo: true },
        orderBy: { ordem: 'asc' },
        select: { id: true, valor: true },
      },
    },
  });
  return res.json({ atributos });
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { nome, slug } = req.body;
  if (!nome || !slug) return res.status(400).json({ error: 'Nome e slug são obrigatórios' });

  const categoria = await prisma.categoria.create({ data: { nome, slug } });
  return res.status(201).json({ categoria });
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { nome, slug, ativo } = req.body;
  const data: Record<string, unknown> = {};
  if (nome) data.nome = nome;
  if (slug) data.slug = slug;
  if (ativo !== undefined) data.ativo = ativo;

  const categoria = await prisma.categoria.update({
    where: { id: parseInt(req.params.id) },
    data,
  });
  return res.json({ categoria });
});

export default router;
