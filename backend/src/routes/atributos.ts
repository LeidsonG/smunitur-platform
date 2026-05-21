import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET / — lista todos atributos globais com opções (público)
router.get('/', async (_req, res: Response) => {
  const atributos = await prisma.atributo.findMany({
    orderBy: { ordem: 'asc' },
    include: { opcoes: { orderBy: { ordem: 'asc' } } },
  });
  return res.json({ atributos });
});

// POST / — cria atributo global (admin)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { nome, ordem = 0 } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' });
  try {
    const atributo = await prisma.atributo.create({
      data: { nome: nome.trim(), ordem },
      include: { opcoes: true },
    });
    return res.status(201).json({ atributo });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe um atributo com este nome.' });
    }
    throw e;
  }
});

// PUT /:id — atualiza atributo (admin)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { nome, ordem } = req.body;
  const data: Record<string, unknown> = {};
  if (nome !== undefined) data.nome = nome.trim();
  if (ordem !== undefined) data.ordem = ordem;
  try {
    const atributo = await prisma.atributo.update({ where: { id }, data });
    return res.json({ atributo });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe um atributo com este nome.' });
    }
    throw e;
  }
});

// DELETE /:id — exclui atributo global (admin)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.atributo.delete({ where: { id: parseInt(req.params.id) } });
  return res.json({ ok: true });
});

// POST /:id/opcoes — adiciona opção ao atributo (admin)
router.post('/:id/opcoes', authMiddleware, async (req: AuthRequest, res: Response) => {
  const atributoId = parseInt(req.params.id);
  const { valor, ordem = 0 } = req.body;
  if (!valor?.trim()) return res.status(400).json({ error: 'valor é obrigatório' });
  try {
    const opcao = await prisma.opcaoAtributo.create({
      data: { atributoId, valor: valor.trim(), ordem },
    });
    return res.status(201).json({ opcao });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Esta opção já existe neste atributo.' });
    }
    throw e;
  }
});

// PATCH /opcoes/:opcaoId — atualiza opção (admin)
router.patch('/opcoes/:opcaoId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.opcaoId);
  const { valor, ordem } = req.body;
  const data: Record<string, unknown> = {};
  if (valor !== undefined) data.valor = valor.trim();
  if (ordem !== undefined) data.ordem = ordem;
  try {
    const opcao = await prisma.opcaoAtributo.update({ where: { id }, data });
    return res.json({ opcao });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Esta opção já existe neste atributo.' });
    }
    throw e;
  }
});

// DELETE /opcoes/:opcaoId — remove opção (admin)
router.delete('/opcoes/:opcaoId', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.opcaoAtributo.delete({ where: { id: parseInt(req.params.opcaoId) } });
  return res.json({ ok: true });
});

export default router;
