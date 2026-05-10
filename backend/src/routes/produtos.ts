import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { upload } from '../utils/upload';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/produtos — lista produtos ativos (público)
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
  [
    body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
    body('categoria_id').isInt().withMessage('Categoria obrigatória'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome, descricao, categoria_id } = req.body;
    const imagem = req.file ? `/uploads/${req.file.filename}` : null;

    const produto = await prisma.produto.create({
      data: {
        nome,
        descricao: descricao || null,
        categoriaId: parseInt(categoria_id),
        imagem,
      },
    });

    return res.status(201).json({ produto });
  }
);

// PUT /api/produtos/:id (protegido)
router.put(
  '/:id',
  authMiddleware,
  upload.single('imagem'),
  async (req: Request, res: Response) => {
    const { nome, descricao, categoria_id, ativo } = req.body;
    const data: Record<string, unknown> = {};
    if (nome) data.nome = nome;
    if (descricao !== undefined) data.descricao = descricao;
    if (categoria_id) data.categoriaId = parseInt(categoria_id);
    if (ativo !== undefined) data.ativo = ativo === 'true' || ativo === true;
    if (req.file) data.imagem = `/uploads/${req.file.filename}`;

    const produto = await prisma.produto.update({
      where: { id: parseInt(req.params.id) },
      data,
    });

    return res.json({ produto });
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

export default router;
