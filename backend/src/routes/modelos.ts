import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';

import prisma from '../utils/prisma';
import { upload, validarMagicBytes, processarImagens, apagarUpload } from '../middleware/upload';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const erroUnico = (e: unknown, res: Response) => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return res.status(409).json({ error: 'Já existe um modelo com este nome nesta linha.' });
  }
  throw e;
};

// GET /api/modelos — lista modelos (público)
router.get('/', async (req: Request, res: Response) => {
  const { linha, apenasAtivos = 'true' } = req.query;
  const where: Record<string, unknown> = {};
  if (apenasAtivos === 'true') where.ativo = true;
  if (linha) where.linhaId = parseInt(linha as string);

  const modelos = await prisma.modelo.findMany({
    where,
    include: { linha: true },
    orderBy: [{ linha: { nome: 'asc' } }, { nome: 'asc' }],
  });

  return res.json({ modelos });
});

// GET /api/modelos/:id
router.get('/:id', async (req: Request, res: Response) => {
  const modelo = await prisma.modelo.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { linha: true },
  });
  if (!modelo) return res.status(404).json({ error: 'Modelo não encontrado' });
  return res.json({ modelo });
});

// POST /api/modelos (protegido)
router.post(
  '/',
  authMiddleware,
  upload.single('imagem'),
  validarMagicBytes,
  processarImagens,
  [
    body('nome').trim().notEmpty().withMessage('Nome obrigatório'),
    body('linha_id').isInt().withMessage('Linha obrigatória'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome, descricao, linha_id } = req.body;
    const imagem = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const modelo = await prisma.modelo.create({
        data: { nome, descricao: descricao || null, linhaId: parseInt(linha_id), imagem },
      });
      return res.status(201).json({ modelo });
    } catch (e) { return erroUnico(e, res); }
  }
);

// PUT /api/modelos/:id (protegido)
router.put(
  '/:id',
  authMiddleware,
  upload.single('imagem'),
  validarMagicBytes,
  processarImagens,
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { nome, descricao, linha_id, ativo } = req.body;
    const data: Record<string, unknown> = {};
    if (nome) data.nome = nome;
    if (descricao !== undefined) data.descricao = descricao;
    if (linha_id) data.linhaId = parseInt(linha_id);
    if (ativo !== undefined) data.ativo = ativo === 'true' || ativo === true;

    // Se houver imagem nova, captura a antiga ANTES do update para apagar
    // depois — evita acúmulo de arquivos órfãos no disco.
    let imagemAntiga: string | null = null;
    if (req.file) {
      const atual = await prisma.modelo.findUnique({ where: { id }, select: { imagem: true } });
      imagemAntiga = atual?.imagem ?? null;
      data.imagem = `/uploads/${req.file.filename}`;
    }

    try {
      const modelo = await prisma.modelo.update({ where: { id }, data });
      if (imagemAntiga) await apagarUpload(imagemAntiga);
      return res.json({ modelo });
    } catch (e) { return erroUnico(e, res); }
  }
);

// PATCH /api/modelos/:id/toggle — ativa/desativa (protegido)
router.patch('/:id/toggle', authMiddleware, async (req: Request, res: Response) => {
  const modelo = await prisma.modelo.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!modelo) return res.status(404).json({ error: 'Modelo não encontrado' });

  const atualizado = await prisma.modelo.update({
    where: { id: modelo.id },
    data: { ativo: !modelo.ativo },
  });
  return res.json({ modelo: atualizado });
});

// DELETE /api/modelos/:id (protegido)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const modelo = await prisma.modelo.findUnique({ where: { id }, select: { imagem: true } });
  await prisma.modelo.delete({ where: { id } });
  if (modelo?.imagem) await apagarUpload(modelo.imagem);
  return res.json({ ok: true });
});

// GET /api/modelos/:id/especificacoes — retorna especificações do modelo
// com as variações habilitadas (público — consumido pelo formulário do cliente)
router.get('/:id/especificacoes', async (req: Request, res: Response) => {
  const modeloId = parseInt(req.params.id);
  if (isNaN(modeloId)) return res.status(400).json({ error: 'ID inválido' });

  const modeloEspecs = await prisma.modeloEspecificacao.findMany({
    where: { modeloId },
    orderBy: { ordem: 'asc' },
    include: {
      especificacao: { select: { nome: true } },
      variacoes: {
        include: { variacao: { select: { id: true, valor: true, imagem: true, ordem: true } } },
        orderBy: { variacao: { ordem: 'asc' } },
      },
    },
  });

  const especificacoes = modeloEspecs.map(me => ({
    id: me.id,
    especificacaoId: me.especificacaoId,
    nome: me.especificacao.nome,
    obrigatorio: me.obrigatorio,
    variacoes: me.variacoes.map(mev => ({ id: mev.variacao.id, valor: mev.variacao.valor, imagem: mev.variacao.imagem ?? null })),
  }));

  return res.json({ especificacoes });
});

// POST /api/modelos/:id/especificacoes — associa especificação global ao modelo (admin)
router.post('/:id/especificacoes', authMiddleware, async (req: Request, res: Response) => {
  const modeloId = parseInt(req.params.id);
  const { especificacao_id, obrigatorio = false, variacao_ids = [] } = req.body;
  if (!especificacao_id) return res.status(400).json({ error: 'especificacao_id é obrigatório' });

  const total = await prisma.modeloEspecificacao.count({ where: { modeloId } });

  try {
    const me = await prisma.modeloEspecificacao.create({
      data: {
        modeloId,
        especificacaoId: parseInt(especificacao_id),
        obrigatorio,
        ordem: total,
        variacoes: { create: (variacao_ids as number[]).map(variacaoId => ({ variacaoId })) },
      },
      include: {
        especificacao: { select: { nome: true } },
        variacoes: { include: { variacao: { select: { id: true, valor: true } } } },
      },
    });

    return res.status(201).json({
      especificacao: {
        id: me.id,
        especificacaoId: me.especificacaoId,
        nome: me.especificacao.nome,
        obrigatorio: me.obrigatorio,
        variacoes: me.variacoes.map(mev => ({ id: mev.variacao.id, valor: mev.variacao.valor })),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return res.status(409).json({ error: 'Esta especificação já está associada a este modelo.' });
    }
    throw e;
  }
});

// PUT /api/modelos/:id/especificacoes/:meId — atualiza variacoes habilitadas / obrigatorio
router.put('/:id/especificacoes/:meId', authMiddleware, async (req: Request, res: Response) => {
  const meId = parseInt(req.params.meId);
  const { obrigatorio, variacao_ids } = req.body;

  if (variacao_ids !== undefined) {
    await prisma.modeloEspecificacaoVariacao.deleteMany({ where: { modeloEspecificacaoId: meId } });
    if ((variacao_ids as number[]).length > 0) {
      await prisma.modeloEspecificacaoVariacao.createMany({
        data: (variacao_ids as number[]).map(variacaoId => ({ modeloEspecificacaoId: meId, variacaoId })),
      });
    }
  }

  if (obrigatorio !== undefined) {
    await prisma.modeloEspecificacao.update({ where: { id: meId }, data: { obrigatorio } });
  }

  const me = await prisma.modeloEspecificacao.findUnique({
    where: { id: meId },
    include: {
      especificacao: { select: { nome: true } },
      variacoes: { include: { variacao: { select: { id: true, valor: true } } } },
    },
  });

  return res.json({
    especificacao: {
      id: me!.id,
      especificacaoId: me!.especificacaoId,
      nome: me!.especificacao.nome,
      obrigatorio: me!.obrigatorio,
      variacoes: me!.variacoes.map(mev => ({ id: mev.variacao.id, valor: mev.variacao.valor })),
    },
  });
});

// DELETE /api/modelos/:id/especificacoes/:meId — remove associação
router.delete('/:id/especificacoes/:meId', authMiddleware, async (req: Request, res: Response) => {
  await prisma.modeloEspecificacao.delete({ where: { id: parseInt(req.params.meId) } });
  return res.json({ ok: true });
});

// POST /api/modelos/:id/especificacoes/copiar — copia todas as especificações
// de um modelo de origem para o modelo destino (:id). Não sobrescreve: se
// uma especificação já estiver associada ao destino, é pulada para preservar
// a configuração existente (variações habilitadas + obrigatório). Devolve o
// snapshot completo de especificações do destino após a operação.
router.post('/:id/especificacoes/copiar', authMiddleware, async (req: Request, res: Response) => {
  const destinoId = parseInt(req.params.id);
  const origemIdRaw = req.body?.origem_id;
  if (!origemIdRaw) return res.status(400).json({ error: 'origem_id é obrigatório' });

  const origemId = parseInt(origemIdRaw);
  if (isNaN(origemId) || isNaN(destinoId)) return res.status(400).json({ error: 'IDs inválidos' });
  if (origemId === destinoId) return res.status(400).json({ error: 'Modelo de origem deve ser diferente do destino' });

  const [origemExiste, destinoExiste] = await Promise.all([
    prisma.modelo.findUnique({ where: { id: origemId }, select: { id: true } }),
    prisma.modelo.findUnique({ where: { id: destinoId }, select: { id: true } }),
  ]);
  if (!origemExiste) return res.status(404).json({ error: 'Modelo de origem não encontrado' });
  if (!destinoExiste) return res.status(404).json({ error: 'Modelo de destino não encontrado' });

  const origemEspecs = await prisma.modeloEspecificacao.findMany({
    where: { modeloId: origemId },
    include: { variacoes: true },
    orderBy: { ordem: 'asc' },
  });

  const destinoExistentes = await prisma.modeloEspecificacao.findMany({
    where: { modeloId: destinoId },
    select: { especificacaoId: true },
  });
  const especIdsExistentes = new Set(destinoExistentes.map(e => e.especificacaoId));
  const ordemInicial = destinoExistentes.length;

  let criadas = 0;
  let puladas = 0;
  for (const me of origemEspecs) {
    if (especIdsExistentes.has(me.especificacaoId)) {
      puladas++;
      continue;
    }
    await prisma.modeloEspecificacao.create({
      data: {
        modeloId: destinoId,
        especificacaoId: me.especificacaoId,
        obrigatorio: me.obrigatorio,
        ordem: ordemInicial + criadas,
        variacoes: {
          create: me.variacoes.map(v => ({ variacaoId: v.variacaoId })),
        },
      },
    });
    criadas++;
  }

  // Devolve o estado completo das especificações do destino — mesmo shape
  // usado por GET /:id/especificacoes para que o frontend possa substituir
  // o array sem chamada extra.
  const finais = await prisma.modeloEspecificacao.findMany({
    where: { modeloId: destinoId },
    orderBy: { ordem: 'asc' },
    include: {
      especificacao: { select: { nome: true } },
      variacoes: {
        include: { variacao: { select: { id: true, valor: true, imagem: true, ordem: true } } },
        orderBy: { variacao: { ordem: 'asc' } },
      },
    },
  });

  return res.json({
    criadas,
    puladas,
    especificacoes: finais.map(me => ({
      id: me.id,
      especificacaoId: me.especificacaoId,
      nome: me.especificacao.nome,
      obrigatorio: me.obrigatorio,
      variacoes: me.variacoes.map(mev => ({ id: mev.variacao.id, valor: mev.variacao.valor, imagem: mev.variacao.imagem ?? null })),
    })),
  });
});

export default router;
