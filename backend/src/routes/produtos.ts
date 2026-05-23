import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';

import prisma from '../utils/prisma';
import { upload, validarMagicBytes } from '../utils/upload';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const erroUnico = (e: unknown, res: Response) => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return res.status(409).json({ error: 'Já existe um produto com este nome nesta categoria.' });
  }
  throw e;
};

// GET /api/produtos — lista produtos (público)
router.get('/', async (req: Request, res: Response) => {
  const { categoria, apenasAtivos = 'true' } = req.query;
  const where: Record<string, unknown> = {};
  if (apenasAtivos === 'true') where.ativo = true;
  if (categoria) where.categoriaId = parseInt(categoria as string);

  const produtos = await prisma.produto.findMany({
    where,
    include: { categoria: true },
    orderBy: { nome: 'asc' },
  });

  return res.json({ produtos });
});

// GET /api/produtos/:id
router.get('/:id', async (req: Request, res: Response) => {
  const produto = await prisma.produto.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { categoria: true },
  });
  if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
  return res.json({ produto });
});

// POST /api/produtos (protegido)
router.post(
  '/',
  authMiddleware,
  upload.single('imagem'),
  validarMagicBytes,
  [
    body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
    body('categoria_id').isInt().withMessage('Categoria obrigatória'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome, descricao, categoria_id } = req.body;
    const imagem = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const produto = await prisma.produto.create({
        data: { nome, descricao: descricao || null, categoriaId: parseInt(categoria_id), imagem },
      });
      return res.status(201).json({ produto });
    } catch (e) { return erroUnico(e, res); }
  }
);

// PUT /api/produtos/:id (protegido)
router.put(
  '/:id',
  authMiddleware,
  upload.single('imagem'),
  validarMagicBytes,
  async (req: Request, res: Response) => {
    const { nome, descricao, categoria_id, ativo } = req.body;
    const data: Record<string, unknown> = {};
    if (nome) data.nome = nome;
    if (descricao !== undefined) data.descricao = descricao;
    if (categoria_id) data.categoriaId = parseInt(categoria_id);
    if (ativo !== undefined) data.ativo = ativo === 'true' || ativo === true;
    if (req.file) data.imagem = `/uploads/${req.file.filename}`;

    try {
      const produto = await prisma.produto.update({ where: { id: parseInt(req.params.id) }, data });
      return res.json({ produto });
    } catch (e) { return erroUnico(e, res); }
  }
);

// PATCH /api/produtos/:id/toggle — ativa/desativa (protegido)
router.patch('/:id/toggle', authMiddleware, async (req: Request, res: Response) => {
  const produto = await prisma.produto.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });

  const atualizado = await prisma.produto.update({
    where: { id: produto.id },
    data: { ativo: !produto.ativo },
  });
  return res.json({ produto: atualizado });
});

// DELETE /api/produtos/:id (protegido)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await prisma.produto.delete({ where: { id } });
  return res.json({ ok: true });
});

// GET /api/produtos/:id/atributos — retorna atributos do produto com opcoes habilitadas (público)
router.get('/:id/atributos', async (req: Request, res: Response) => {
  const produtoId = parseInt(req.params.id);
  if (isNaN(produtoId)) return res.status(400).json({ error: 'ID inválido' });

  const produtoAtributos = await prisma.produtoAtributo.findMany({
    where: { produtoId },
    orderBy: { ordem: 'asc' },
    include: {
      atributo: { select: { nome: true } },
      opcoes: {
        include: { opcao: { select: { id: true, valor: true, imagem: true, ordem: true } } },
        orderBy: { opcao: { ordem: 'asc' } },
      },
    },
  });

  const atributos = produtoAtributos.map(pa => ({
    id: pa.id,
    atributoId: pa.atributoId,
    nome: pa.atributo.nome,
    obrigatorio: pa.obrigatorio,
    opcoes: pa.opcoes.map(pao => ({ id: pao.opcao.id, valor: pao.opcao.valor, imagem: pao.opcao.imagem ?? null })),
  }));

  return res.json({ atributos });
});

// POST /api/produtos/:id/atributos — associa atributo global ao produto (admin)
router.post('/:id/atributos', authMiddleware, async (req: Request, res: Response) => {
  const produtoId = parseInt(req.params.id);
  const { atributo_id, obrigatorio = false, opcao_ids = [] } = req.body;
  if (!atributo_id) return res.status(400).json({ error: 'atributo_id é obrigatório' });

  const total = await prisma.produtoAtributo.count({ where: { produtoId } });

  try {
    const pa = await prisma.produtoAtributo.create({
      data: {
        produtoId,
        atributoId: parseInt(atributo_id),
        obrigatorio,
        ordem: total,
        opcoes: { create: (opcao_ids as number[]).map(opcaoId => ({ opcaoId })) },
      },
      include: {
        atributo: { select: { nome: true } },
        opcoes: { include: { opcao: { select: { id: true, valor: true } } } },
      },
    });

    return res.status(201).json({
      atributo: {
        id: pa.id,
        atributoId: pa.atributoId,
        nome: pa.atributo.nome,
        obrigatorio: pa.obrigatorio,
        opcoes: pa.opcoes.map(pao => ({ id: pao.opcao.id, valor: pao.opcao.valor })),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Este atributo já está associado a este produto.' });
    }
    throw e;
  }
});

// PUT /api/produtos/:id/atributos/:paId — atualiza opcoes habilitadas / obrigatorio (admin)
router.put('/:id/atributos/:paId', authMiddleware, async (req: Request, res: Response) => {
  const paId = parseInt(req.params.paId);
  const { obrigatorio, opcao_ids } = req.body;

  if (opcao_ids !== undefined) {
    await prisma.produtoAtributoOpcao.deleteMany({ where: { produtoAtributoId: paId } });
    if ((opcao_ids as number[]).length > 0) {
      await prisma.produtoAtributoOpcao.createMany({
        data: (opcao_ids as number[]).map(opcaoId => ({ produtoAtributoId: paId, opcaoId })),
      });
    }
  }

  if (obrigatorio !== undefined) {
    await prisma.produtoAtributo.update({ where: { id: paId }, data: { obrigatorio } });
  }

  const pa = await prisma.produtoAtributo.findUnique({
    where: { id: paId },
    include: {
      atributo: { select: { nome: true } },
      opcoes: { include: { opcao: { select: { id: true, valor: true } } } },
    },
  });

  return res.json({
    atributo: {
      id: pa!.id,
      atributoId: pa!.atributoId,
      nome: pa!.atributo.nome,
      obrigatorio: pa!.obrigatorio,
      opcoes: pa!.opcoes.map(pao => ({ id: pao.opcao.id, valor: pao.opcao.valor })),
    },
  });
});

// DELETE /api/produtos/:id/atributos/:paId — remove associação (admin)
router.delete('/:id/atributos/:paId', authMiddleware, async (req: Request, res: Response) => {
  await prisma.produtoAtributo.delete({ where: { id: parseInt(req.params.paId) } });
  return res.json({ ok: true });
});

export default router;
