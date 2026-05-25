import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const todos = req.query.todos === 'true';
  const where = todos
    ? { ativo: true }
    : { ativo: true, modelos: { some: { ativo: true } } };

  const linhas = await prisma.linha.findMany({
    where,
    orderBy: { nome: 'asc' },
  });
  return res.json({ linhas });
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { nome, slug } = req.body;
  if (!nome || !slug) return res.status(400).json({ error: 'Nome e slug são obrigatórios' });

  try {
    const linha = await prisma.linha.create({ data: { nome, slug } });
    return res.status(201).json({ linha });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const campo = (e.meta?.target as string[])?.includes('slug') ? 'slug' : 'nome';
      return res.status(409).json({ error: `Já existe uma linha com este ${campo}.` });
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
    const linha = await prisma.linha.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    return res.json({ linha });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const campo = (e.meta?.target as string[])?.includes('slug') ? 'slug' : 'nome';
      return res.status(409).json({ error: `Já existe uma linha com este ${campo}.` });
    }
    throw e;
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const temModelos = await prisma.modelo.count({ where: { linhaId: id } });
  if (temModelos > 0) {
    return res.status(400).json({ error: 'Linha possui modelos vinculados. Remova os modelos antes de excluir a linha.' });
  }

  await prisma.linha.delete({ where: { id } });
  return res.json({ message: 'Linha excluída com sucesso' });
});

export default router;
