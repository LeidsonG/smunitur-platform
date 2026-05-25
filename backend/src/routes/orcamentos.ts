/**
 * Rotas de Orçamento (/api/orcamentos)
 * --------------------------------------------------------------------------
 * - POST /                       → público (cria orçamento + upload imgs)
 * - GET /acompanhar/:numero      → público (cliente consulta pelo número)
 * - GET /                        → admin (listagem com filtros/paginação)
 * - GET /:id                     → admin (detalhe completo)
 * - PATCH /:id/status            → admin (transição de status + histórico)
 * - PATCH /:id/valor             → admin (define valor do orçamento)
 *
 * Convenção: a rota /api/orcamentos é a ÚNICA fonte de verdade para mudar
 * o status de um orçamento — o painel de Produção também consome essa rota.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { StatusOrcamento } from '@prisma/client';
import prisma from '../utils/prisma';
import { upload, validarMagicBytes, processarImagens } from '../utils/upload';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Lista derivada do enum do Prisma para validar entrada de PATCH /:id/status.
const STATUS_VALIDOS = new Set<string>(Object.values(StatusOrcamento));

// Gera próximo número de orçamento (começa em 100)
async function gerarNumeroOrcamento(): Promise<number> {
  const ultimo = await prisma.orcamento.findFirst({
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  return ultimo ? ultimo.numero + 1 : 100;
}

// POST /api/orcamentos — cria novo orçamento (público)
router.post(
  '/',
  upload.array('imagem_referencia', 5),
  validarMagicBytes,
  processarImagens,
  [
    body('nome_cliente').trim().notEmpty().withMessage('Nome obrigatório'),
    body('email_cliente').isEmail().withMessage('E-mail inválido'),
    body('telefone_cliente').trim().notEmpty().withMessage('Telefone obrigatório'),
    body('produto_desejado').trim().notEmpty().withMessage('Produto obrigatório'),
    body('quantidade').isInt({ min: 1 }).withMessage('Quantidade deve ser número inteiro maior que 0'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        nome_cliente, email_cliente, telefone_cliente,
        cpf_cnpj, produto_desejado, quantidade,
        tamanhos, cores, detalhes, observacoes,
      } = req.body;

      const arquivos = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];
      const imagemReferencia = arquivos.length > 0
        ? arquivos.map(f => `/uploads/${f.filename}`).join(',')
        : null;
      const numero = await gerarNumeroOrcamento();

      const orcamento = await prisma.orcamento.create({
        data: {
          numero,
          nomeCliente: nome_cliente,
          emailCliente: email_cliente,
          telefoneCliente: telefone_cliente,
          cpfCnpj: cpf_cnpj || null,
          produtoDesejado: produto_desejado,
          quantidade: parseInt(quantidade),
          tamanhos: tamanhos || null,
          cores: cores || null,
          detalhes: detalhes || null,
          observacoes: observacoes || null,
          imagemReferencia,
          status: 'recebido',
        },
      });

      // Salva atributos selecionados (opcional)
      const atributosRaw = req.body.atributos;
      if (atributosRaw) {
        try {
          const atributosData = JSON.parse(atributosRaw) as { atributo_id: number; opcao_id?: number; valor_livre?: string }[];
          if (Array.isArray(atributosData) && atributosData.length > 0) {
            await prisma.orcamentoAtributo.createMany({
              data: atributosData.map((a) => ({
                orcamentoId: orcamento.id,
                produtoAtributoId: a.atributo_id,
                opcaoId: a.opcao_id ?? null,
                valorLivre: a.valor_livre ?? null,
              })),
            });
          }
        } catch { /* atributos malformados — ignora */ }
      }

      // Registra histórico inicial
      await prisma.orcamentoStatusHistorico.create({
        data: {
          orcamentoId: orcamento.id,
          statusNovo: 'recebido',
          observacao: 'Orçamento recebido pelo sistema',
        },
      });

      return res.status(201).json({ orcamento });
    } catch (e) {
      return next(e);
    }
  }
);

// GET /api/orcamentos/acompanhar/:numero — consulta pública por número
router.get('/acompanhar/:numero', async (req: Request, res: Response) => {
  const numero = parseInt(req.params.numero);
  if (isNaN(numero)) {
    return res.status(400).json({ error: 'Número de orçamento inválido' });
  }

  const orcamento = await prisma.orcamento.findUnique({
    where: { numero },
    select: {
      numero: true,
      nomeCliente: true,
      produtoDesejado: true,
      quantidade: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      historicos: {
        orderBy: { createdAt: 'asc' },
        select: { statusNovo: true, observacao: true, createdAt: true },
      },
    },
  });

  if (!orcamento) {
    return res.status(404).json({ error: 'Orçamento não encontrado' });
  }

  return res.json({ orcamento });
});

// GET /api/orcamentos — listagem admin (protegido)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status, busca, pagina = '1', limite = '20' } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (busca) {
    where.OR = [
      { nomeCliente: { contains: busca as string } },
      { emailCliente: { contains: busca as string } },
      { numero: isNaN(parseInt(busca as string)) ? undefined : parseInt(busca as string) },
    ].filter(Boolean);
  }

  const skip = (parseInt(pagina as string) - 1) * parseInt(limite as string);
  const take = parseInt(limite as string);

  const [orcamentos, total] = await Promise.all([
    prisma.orcamento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.orcamento.count({ where }),
  ]);

  return res.json({ orcamentos, total, pagina: parseInt(pagina as string), limite: take });
});

// GET /api/orcamentos/:id — detalhes admin (protegido)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const orcamento = await prisma.orcamento.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      historicos: {
        orderBy: { createdAt: 'asc' },
        include: { usuario: { select: { nome: true } } },
      },
      atributosOrcamento: {
        include: {
          // OrcamentoAtributo aponta para ProdutoAtributo, que por sua vez
          // aponta para Atributo — precisamos atravessar 2 níveis para
          // chegar no nome do atributo escolhido pelo cliente.
          produtoAtributo: { include: { atributo: { select: { nome: true } } } },
          opcao: { select: { valor: true } },
        },
      },
    },
  });

  if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
  return res.json({ orcamento });
});

// PATCH /api/orcamentos/:id/valor — define/atualiza valor do orçamento (protegido)
router.patch('/:id/valor', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  const { valor } = req.body;

  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

  const valorNum = valor === null || valor === '' ? null : parseFloat(valor);
  if (valor !== null && valor !== '' && isNaN(valorNum as number)) {
    return res.status(400).json({ error: 'Valor inválido' });
  }

  const orcamento = await prisma.orcamento.findUnique({ where: { id } });
  if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });

  const atualizado = await prisma.orcamento.update({
    where: { id },
    data: { valor: valorNum },
  });

  return res.json({ orcamento: atualizado });
});

// PATCH /api/orcamentos/:id/status — transição de status (protegido)
//
// Toda mudança fica registrada em `orcamento_status_historico` com:
//   - status anterior + novo
//   - observação opcional (texto livre do admin)
//   - usuário responsável (quando autenticado)
//
// Não há máquina de estados formal: qualquer status pode ir para qualquer
// outro. Validação rejeita apenas valores fora do enum.
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status, observacao } = req.body;
  const id = parseInt(req.params.id);

  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  if (!STATUS_VALIDOS.has(status)) return res.status(400).json({ error: 'Status inválido' });

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

export default router;
