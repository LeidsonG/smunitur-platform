import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const todos = req.query.todos === 'true';
  const where = todos
    ? { ativo: true }
    : { ativo: true, produtos: { some: { ativo: true } } };

  const categorias = await prisma.categoria.findMany({
    where,
    orderBy: { nome: 'asc' },
  });
  return res.json({ categorias });
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { nome, slug } = req.body;
  if (!nome || !slug) return res.status(400).json({ error: 'Nome e slug são obrigatórios' });

  try {
    const categoria = await prisma.categoria.create({ data: { nome, slug } });
    return res.status(201).json({ categoria });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const campo = (e.meta?.target as string[])?.includes('slug') ? 'slug' : 'nome';
      return res.status(409).json({ error: `Já existe uma categoria com este ${campo}.` });
    }
    throw e;
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { nome, slug, ativo } = req.body;
  const data: Record<string, unknown> = {};
  if (nome) data.nome = nome;
  if (slug) data.slug = slug;
  if (ativo !== undefined) data.ativo = ativo;

  try {
    const categoria = await prisma.categoria.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    return res.json({ categoria });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const campo = (e.meta?.target as string[])?.includes('slug') ? 'slug' : 'nome';
      return res.status(409).json({ error: `Já existe uma categoria com este ${campo}.` });
    }
    throw e;
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const temProdutos = await prisma.produto.count({ where: { categoriaId: id } });
  if (temProdutos > 0) {
    return res.status(400).json({ error: 'Categoria possui produtos vinculados. Remova os produtos antes de excluir a categoria.' });
  }

  await prisma.categoria.delete({ where: { id } });
  return res.json({ message: 'Categoria excluída com sucesso' });
});

export default router;
