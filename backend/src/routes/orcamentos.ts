/**
 * Rotas de Orçamento (/api/orcamentos)
 * --------------------------------------------------------------------------
 * - POST /                       → público (cria orçamento + upload imgs)
 * - GET /acompanhar/:numero      → público (cliente consulta pelo número)
 * - GET /                        → admin (listagem com filtros/paginação)
 * - GET /:id                     → admin (detalhe completo)
 * - PATCH /:id/status            → admin (transição de status + histórico)
 * - PATCH /:id/valor             → admin (define valor do orçamento)
 * - PUT  /:id/layout-final       → admin (upload do layout final aprovado)
 *
 * Convenção: a rota /api/orcamentos é a ÚNICA fonte de verdade para mudar
 * o status de um orçamento — o painel de Produção também consome essa rota.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { StatusOrcamento, Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { upload, validarMagicBytes, processarImagens, apagarUpload } from '../utils/upload';
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
    body('modelo_desejado').trim().notEmpty().withMessage('Modelo obrigatório'),
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
        cpf_cnpj, modelo_desejado, quantidade,
        tamanhos, cores, detalhes, observacoes,
      } = req.body;

      const arquivos = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];
      const imagemReferencia = arquivos.length > 0
        ? arquivos.map(f => `/uploads/${f.filename}`).join(',')
        : null;

      const dadosBase = {
        nomeCliente: nome_cliente,
        emailCliente: email_cliente,
        telefoneCliente: telefone_cliente,
        cpfCnpj: cpf_cnpj || null,
        modeloDesejado: modelo_desejado,
        quantidade: parseInt(quantidade),
        tamanhos: tamanhos || null,
        cores: cores || null,
        detalhes: detalhes || null,
        observacoes: observacoes || null,
        imagemReferencia,
        status: 'recebido' as const,
      };

      // O número é gerado pela aplicação (não pelo banco) para ser amigável ao
      // cliente. Como dois envios simultâneos podem ler o mesmo "último + 1",
      // tentamos novamente em caso de colisão no índice único (P2002).
      let orcamento;
      for (let tentativa = 0; tentativa < 5; tentativa++) {
        const numero = await gerarNumeroOrcamento();
        try {
          orcamento = await prisma.orcamento.create({ data: { numero, ...dadosBase } });
          break;
        } catch (err) {
          const colisaoNumero =
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002' &&
            (err.meta?.target as string[] | undefined)?.includes('numero');
          if (colisaoNumero && tentativa < 4) continue;
          throw err;
        }
      }
      if (!orcamento) throw new Error('Não foi possível gerar número de orçamento');

      // Salva especificações selecionadas (opcional)
      const especificacoesRaw = req.body.especificacoes;
      if (especificacoesRaw) {
        try {
          const especsData = JSON.parse(especificacoesRaw) as { modelo_especificacao_id: number; variacao_id?: number; valor_livre?: string }[];
          if (Array.isArray(especsData) && especsData.length > 0) {
            await prisma.orcamentoEspecificacao.createMany({
              data: especsData.map((e) => ({
                orcamentoId: orcamento.id,
                modeloEspecificacaoId: e.modelo_especificacao_id,
                variacaoId: e.variacao_id ?? null,
                valorLivre: e.valor_livre ?? null,
              })),
            });
          }
        } catch { /* especificacoes malformadas — ignora */ }
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

// POST /api/orcamentos/acompanhar — consulta pública (exige número + e-mail).
// Mudamos de GET para POST porque agora exigimos o e-mail do solicitante como
// segundo fator: assim ninguém consegue listar orçamentos alheios apenas
// adivinhando o número. Resposta 404 é a mesma para "número inexistente" ou
// "e-mail não confere", evitando enumeração.
router.post(
  '/acompanhar',
  [
    body('numero').isInt({ min: 1 }).withMessage('Número de orçamento inválido'),
    body('email').isEmail().withMessage('E-mail inválido').normalizeEmail(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const numero = parseInt(req.body.numero);
    const email = String(req.body.email).toLowerCase();

    const orcamento = await prisma.orcamento.findUnique({
      where: { numero },
      select: {
        numero: true,
        nomeCliente: true,
        emailCliente: true,
        modeloDesejado: true,
        quantidade: true,
        status: true,
        imagemReferencia: true,
        layoutFinal: true,
        createdAt: true,
        updatedAt: true,
        historicos: {
          orderBy: { createdAt: 'asc' },
          select: { statusNovo: true, observacao: true, createdAt: true },
        },
      },
    });

    // Mesmo response para "não existe" e "email errado" — evita enumeração.
    if (!orcamento || orcamento.emailCliente.toLowerCase() !== email) {
      return res.status(404).json({ error: 'Orçamento não encontrado ou e-mail não confere' });
    }

    // Não devolvemos o e-mail no payload final (cliente já o digitou).
    const { emailCliente: _email, ...payload } = orcamento;
    return res.json({ orcamento: payload });
  }
);

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
      especificacoesOrcament: {
        include: {
          // OrcamentoEspecificacao aponta para ModeloEspecificacao, que por
          // sua vez aponta para Especificacao — atravessamos 2 níveis para
          // chegar no nome da especificação escolhida pelo cliente.
          modeloEspecificacao: { include: { especificacao: { select: { nome: true } } } },
          variacao: { select: { valor: true } },
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

// PUT /api/orcamentos/:id/layout-final — admin sobe o layout final aprovado
// Substitui o anterior (apaga do disco) e atualiza o registro do orçamento.
router.put(
  '/:id/layout-final',
  authMiddleware,
  upload.single('layout'),
  validarMagicBytes,
  processarImagens,
  async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

    const atual = await prisma.orcamento.findUnique({
      where: { id },
      select: { layoutFinal: true },
    });
    if (!atual) {
      await apagarUpload(`/uploads/${req.file.filename}`);
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    const layoutFinal = `/uploads/${req.file.filename}`;
    const atualizado = await prisma.orcamento.update({
      where: { id },
      data: { layoutFinal },
      select: { id: true, layoutFinal: true },
    });

    // Best-effort: limpa o arquivo anterior do disco.
    if (atual.layoutFinal) await apagarUpload(atual.layoutFinal);

    return res.json({ orcamento: atualizado });
  }
);

export default router;
