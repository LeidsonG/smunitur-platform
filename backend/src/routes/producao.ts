import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/producao — orçamentos em produção
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const orcamentos = await prisma.orcamento.findMany({
    where: { status: { in: ['em_analise', 'aguardando_aprovacao', 'em_producao'] } },
    orderBy: { updatedAt: 'asc' },
    select: {
      id: true, numero: true, nomeCliente: true,
      produtoDesejado: true, quantidade: true, status: true,
      createdAt: true, updatedAt: true,
    },
  });

  return res.json({ orcamentos });
});

// PATCH /api/producao/:id/status
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status, observacao } = req.body;
  const id = parseInt(req.params.id);

  const statusValidos = [
    'recebido', 'em_analise', 'aguardando_aprovacao',
    'em_producao', 'finalizado', 'enviado', 'cancelado',
  ];

  if (!statusValidos.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  const orcamento = await prisma.orcamento.findUnique({ where: { id } });
  if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });

  const atualizado = await prisma.orcamento.update({
    where: { id },
    data: { status },
  });

  await prisma.orcamentoStatusHistorico.create({
    data: {
      orcamentoId: id,
      statusAnterior: orcamento.status,
      statusNovo: status,
      observacao: observacao || null,
      usuarioId: req.admin?.id,
    },
  });

  return res.json({ orcamento: atualizado });
});

// GET /api/producao/:id/historico
router.get('/:id/historico', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const id = parseInt(_req.params.id);

  const historico = await prisma.orcamentoStatusHistorico.findMany({
    where: { orcamentoId: id },
    orderBy: { createdAt: 'asc' },
    include: { usuario: { select: { nome: true } } },
  });

  return res.json({ historico });
});

export default router;
