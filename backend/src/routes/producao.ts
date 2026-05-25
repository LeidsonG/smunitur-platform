/**
 * Painel de Produção (rota: /api/producao)
 * --------------------------------------------------------------------------
 * Visão "esteira": apenas orçamentos que estão em algum estado de produção
 * (análise, aguardando aprovação ou em produção propriamente dita).
 *
 * Atualização de status NÃO vive aqui — usa-se PATCH /api/orcamentos/:id/status
 * (fonte única de verdade para transições). Isso evita ter duas rotas
 * fazendo a mesma coisa em paralelo.
 */
import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const STATUS_NA_ESTEIRA = ['em_analise', 'aguardando_aprovacao', 'em_producao'] as const;

// GET /api/producao — orçamentos em produção (ordem ASC por updatedAt para
// que o "mais antigo sem atualização" apareça primeiro = mais urgente).
router.get('/', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const orcamentos = await prisma.orcamento.findMany({
    where: { status: { in: [...STATUS_NA_ESTEIRA] } },
    orderBy: { updatedAt: 'asc' },
    select: {
      id: true, numero: true, nomeCliente: true,
      produtoDesejado: true, quantidade: true, status: true,
      createdAt: true, updatedAt: true,
    },
  });

  return res.json({ orcamentos });
});

// GET /api/producao/:id/historico — linha do tempo de transições de status
router.get('/:id/historico', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const historico = await prisma.orcamentoStatusHistorico.findMany({
    where: { orcamentoId: id },
    orderBy: { createdAt: 'asc' },
    include: { usuario: { select: { nome: true } } },
  });

  return res.json({ historico });
});

export default router;
