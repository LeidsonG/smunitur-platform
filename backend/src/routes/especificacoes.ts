import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload, validarMagicBytes, processarImagens, apagarUpload } from '../utils/upload';

const router = Router();

// GET / — lista todas especificações globais com variações (público)
router.get('/', async (_req, res: Response) => {
  const especificacoes = await prisma.especificacao.findMany({
    orderBy: { ordem: 'asc' },
    include: { variacoes: { orderBy: { ordem: 'asc' } } },
  });
  return res.json({ especificacoes });
});

// POST / — cria especificação global (admin)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { nome, ordem = 0 } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' });
  try {
    const especificacao = await prisma.especificacao.create({
      data: { nome: nome.trim(), ordem },
      include: { variacoes: true },
    });
    return res.status(201).json({ especificacao });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe uma especificação com este nome.' });
    }
    throw e;
  }
});

// PUT /:id — atualiza especificação (admin)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { nome, ordem } = req.body;
  const data: Record<string, unknown> = {};
  if (nome !== undefined) data.nome = nome.trim();
  if (ordem !== undefined) data.ordem = ordem;
  try {
    const especificacao = await prisma.especificacao.update({ where: { id }, data });
    return res.json({ especificacao });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe uma especificação com este nome.' });
    }
    throw e;
  }
});

// DELETE /:id — exclui especificação global (admin)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.especificacao.delete({ where: { id: parseInt(req.params.id) } });
  return res.json({ ok: true });
});

// POST /:id/variacoes — adiciona variação à especificação (admin)
router.post('/:id/variacoes', authMiddleware, async (req: AuthRequest, res: Response) => {
  const especificacaoId = parseInt(req.params.id);
  const { valor, ordem = 0 } = req.body;
  if (!valor?.trim()) return res.status(400).json({ error: 'valor é obrigatório' });
  try {
    const variacao = await prisma.modeloVariacao.create({
      data: { especificacaoId, valor: valor.trim(), ordem },
    });
    return res.status(201).json({ variacao });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Esta variação já existe nesta especificação.' });
    }
    throw e;
  }
});

// PATCH /variacoes/:variacaoId — atualiza variação (admin)
router.patch('/variacoes/:variacaoId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.variacaoId);
  const { valor, ordem } = req.body;
  const data: Record<string, unknown> = {};
  if (valor !== undefined) data.valor = valor.trim();
  if (ordem !== undefined) data.ordem = ordem;
  try {
    const variacao = await prisma.modeloVariacao.update({ where: { id }, data });
    return res.json({ variacao });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Esta variação já existe nesta especificação.' });
    }
    throw e;
  }
});

// PATCH /variacoes/:variacaoId/imagem — faz upload de imagem para a variação (admin)
router.patch(
  '/variacoes/:variacaoId/imagem',
  authMiddleware,
  upload.single('imagem'),
  validarMagicBytes,
  processarImagens,
  async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.variacaoId);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

    // Captura a imagem anterior antes do update para limpeza pós-sucesso.
    const atual = await prisma.modeloVariacao.findUnique({ where: { id }, select: { imagem: true } });
    const imagem = `/uploads/${req.file.filename}`;
    const variacao = await prisma.modeloVariacao.update({ where: { id }, data: { imagem } });
    if (atual?.imagem) await apagarUpload(atual.imagem);
    return res.json({ variacao });
  }
);

// DELETE /variacoes/:variacaoId — remove variação (admin)
router.delete('/variacoes/:variacaoId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.variacaoId);
  const variacao = await prisma.modeloVariacao.findUnique({ where: { id }, select: { imagem: true } });
  await prisma.modeloVariacao.delete({ where: { id } });
  if (variacao?.imagem) await apagarUpload(variacao.imagem);
  return res.json({ ok: true });
});

export default router;
