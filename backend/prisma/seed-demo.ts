/**
 * Seed de demonstração: popula o banco com dados realistas de confecção
 * (linhas, modelos, especificações e variações) para uso em desenvolvimento.
 *
 * Uso: npm run db:seed:demo
 *
 * Idempotente — pode rodar várias vezes sem duplicar (usa upsert por
 * nome/slug). NÃO usar em produção; é apenas para popular ambiente local
 * de testes. O seed de produção (`seed.ts`) continua criando apenas o
 * usuário admin inicial.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Linhas ─────────────────────────────────────────────────────────────────

const LINHAS = [
  'Camisetas',
  'Polos',
  'Moletons',
  'Jalecos e Aventais',
  'Uniformes Esportivos',
];

// ─── Especificações + Variações ─────────────────────────────────────────────

const ESPECIFICACOES: Array<{
  nome: string;
  ordem: number;
  variacoes: string[];
}> = [
  { nome: 'Tipo de Gola',    ordem: 1, variacoes: ['Careca', 'Polo', 'V', 'Henley'] },
  { nome: 'Tecido',          ordem: 2, variacoes: ['PV (Poliviscose)', '100% Algodão', 'Dry Fit', 'Moletom Flanelado', 'Oxford', 'Microfibra'] },
  { nome: 'Manga',           ordem: 3, variacoes: ['Curta', 'Longa', 'Cavada (Regata)', '3/4'] },
  { nome: 'Cor Principal',   ordem: 4, variacoes: ['Branco', 'Preto', 'Azul Marinho', 'Cinza Mescla', 'Vermelho', 'Verde Bandeira', 'Amarelo', 'Rosa', 'Bege'] },
  { nome: 'Tamanho',         ordem: 5, variacoes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'Infantil 4', 'Infantil 6', 'Infantil 8', 'Infantil 10', 'Infantil 12'] },
  { nome: 'Tipo de Estampa', ordem: 6, variacoes: ['Silk Screen', 'Sublimação', 'Bordado', 'Termocolante', 'Sem estampa'] },
  { nome: 'Bolso',           ordem: 7, variacoes: ['Sem bolso', 'Bolso frontal', 'Bolso lateral', 'Dois bolsos'] },
  { nome: 'Punho',           ordem: 8, variacoes: ['Sem punho', 'Ribana', 'Elástico'] },
];

// ─── Modelos ────────────────────────────────────────────────────────────────

const MODELOS: Array<{
  linha: string;
  nome: string;
  descricao: string;
  especificacoes: Array<{ nome: string; obrigatorio?: boolean }>;
}> = [
  // ─── Camisetas ───────────────────────────────────────────
  {
    linha: 'Camisetas',
    nome: 'Camiseta Básica Algodão',
    descricao: 'Camiseta tradicional em malha 100% algodão fio 30.1. Ideal para uso diário, eventos e uniformes leves.',
    especificacoes: [
      { nome: 'Tipo de Gola', obrigatorio: true },
      { nome: 'Manga', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
    ],
  },
  {
    linha: 'Camisetas',
    nome: 'Camiseta Premium Confort',
    descricao: 'Algodão penteado com toque macio e melhor caimento. Recomendada para uniformes corporativos.',
    especificacoes: [
      { nome: 'Tipo de Gola', obrigatorio: true },
      { nome: 'Manga', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
      { nome: 'Bolso' },
    ],
  },
  {
    linha: 'Camisetas',
    nome: 'Camiseta Dry Fit Esportiva',
    descricao: 'Tecido tecnológico com secagem rápida e alta respirabilidade. Indicada para esportes e ambientes quentes.',
    especificacoes: [
      { nome: 'Tipo de Gola', obrigatorio: true },
      { nome: 'Manga', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
    ],
  },
  {
    linha: 'Camisetas',
    nome: 'Camiseta Manga Longa',
    descricao: 'Modelo com mangas longas e ribana nos punhos. Ideal para inverno ou proteção solar.',
    especificacoes: [
      { nome: 'Tecido', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Punho' },
      { nome: 'Tipo de Estampa' },
    ],
  },
  {
    linha: 'Camisetas',
    nome: 'Camiseta Regata',
    descricao: 'Regata com cava esportiva. Disponível em algodão ou dry fit.',
    especificacoes: [
      { nome: 'Tecido', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
    ],
  },

  // ─── Polos ───────────────────────────────────────────────
  {
    linha: 'Polos',
    nome: 'Polo Tradicional PV',
    descricao: 'Polo em malha piquet PV com punho e gola tricotados. Excelente custo-benefício para uniformes corporativos.',
    especificacoes: [
      { nome: 'Manga', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
      { nome: 'Bolso' },
    ],
  },
  {
    linha: 'Polos',
    nome: 'Polo Premium Algodão',
    descricao: 'Piquet 100% algodão de gramatura superior. Acabamento refinado para ambientes corporativos.',
    especificacoes: [
      { nome: 'Manga', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
      { nome: 'Bolso' },
    ],
  },
  {
    linha: 'Polos',
    nome: 'Polo Feminina Baby Look',
    descricao: 'Modelagem feminina com recortes laterais. Disponível em PV ou algodão.',
    especificacoes: [
      { nome: 'Tecido', obrigatorio: true },
      { nome: 'Manga', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
    ],
  },
  {
    linha: 'Polos',
    nome: 'Polo Manga Longa',
    descricao: 'Polo de manga longa com punho ribana. Indicada para inverno ou ambientes refrigerados.',
    especificacoes: [
      { nome: 'Tecido', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Punho' },
      { nome: 'Tipo de Estampa' },
    ],
  },

  // ─── Moletons ────────────────────────────────────────────
  {
    linha: 'Moletons',
    nome: 'Moletom Canguru com Capuz',
    descricao: 'Moletom flanelado com capuz e bolso canguru frontal. Excelente para outono e inverno.',
    especificacoes: [
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
      { nome: 'Punho' },
    ],
  },
  {
    linha: 'Moletons',
    nome: 'Moletom Aberto com Zíper',
    descricao: 'Modelo aberto com zíper frontal. Pode ser usado como jaqueta esportiva.',
    especificacoes: [
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Punho' },
      { nome: 'Tipo de Estampa' },
      { nome: 'Bolso' },
    ],
  },
  {
    linha: 'Moletons',
    nome: 'Moletom Gola Careca',
    descricao: 'Moletom fechado com gola careca tradicional. Visual clássico, sem capuz.',
    especificacoes: [
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Punho' },
      { nome: 'Tipo de Estampa' },
    ],
  },

  // ─── Jalecos e Aventais ──────────────────────────────────
  {
    linha: 'Jalecos e Aventais',
    nome: 'Jaleco Manga Longa',
    descricao: 'Jaleco profissional manga longa com bolsos. Tecido oxford ou microfibra. Ideal para área da saúde.',
    especificacoes: [
      { nome: 'Tecido', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Bolso' },
      { nome: 'Tipo de Estampa' },
    ],
  },
  {
    linha: 'Jalecos e Aventais',
    nome: 'Jaleco Manga Curta',
    descricao: 'Versão manga curta para ambientes quentes. Mesmo padrão de tecido do jaleco longo.',
    especificacoes: [
      { nome: 'Tecido', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Bolso' },
      { nome: 'Tipo de Estampa' },
    ],
  },
  {
    linha: 'Jalecos e Aventais',
    nome: 'Avental de Cintura',
    descricao: 'Avental curto até a cintura com amarração nas costas. Ideal para cozinha, atendimento e área de alimentos.',
    especificacoes: [
      { nome: 'Tecido', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Bolso' },
      { nome: 'Tipo de Estampa' },
    ],
  },

  // ─── Uniformes Esportivos ────────────────────────────────
  {
    linha: 'Uniformes Esportivos',
    nome: 'Camisa de Futebol',
    descricao: 'Camisa esportiva em dry fit com gola V ou polo. Sublimação total disponível para escudo, números e patrocínios.',
    especificacoes: [
      { nome: 'Tipo de Gola', obrigatorio: true },
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa', obrigatorio: true },
    ],
  },
  {
    linha: 'Uniformes Esportivos',
    nome: 'Shorts Esportivo',
    descricao: 'Shorts em dry fit com elástico e cordão. Combina com camisas esportivas.',
    especificacoes: [
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
    ],
  },
  {
    linha: 'Uniformes Esportivos',
    nome: 'Conjunto Bermuda e Camisa',
    descricao: 'Kit conjunto camiseta + bermuda em dry fit. Personalização de número e nome incluída.',
    especificacoes: [
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tamanho', obrigatorio: true },
      { nome: 'Tipo de Estampa', obrigatorio: true },
    ],
  },
];

// ─── Execução ───────────────────────────────────────────────────────────────

async function main() {
  // eslint-disable-next-line no-console
  console.log('[seed-demo] Iniciando seed de demonstração…');

  // 1. Linhas
  const linhaMap = new Map<string, number>();
  for (const nome of LINHAS) {
    const linha = await prisma.linha.upsert({
      where: { nome },
      create: { nome, slug: slug(nome) },
      update: {},
    });
    linhaMap.set(nome, linha.id);
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-demo] ${linhaMap.size} linhas garantidas.`);

  // 2. Especificações + variações
  const especMap = new Map<string, number>();
  let totalVariacoes = 0;
  for (const e of ESPECIFICACOES) {
    const espec = await prisma.especificacao.upsert({
      where: { nome: e.nome },
      create: { nome: e.nome, ordem: e.ordem },
      update: { ordem: e.ordem },
    });
    especMap.set(e.nome, espec.id);

    for (let i = 0; i < e.variacoes.length; i++) {
      await prisma.modeloVariacao.upsert({
        where: { especificacaoId_valor: { especificacaoId: espec.id, valor: e.variacoes[i] } },
        create: { especificacaoId: espec.id, valor: e.variacoes[i], ordem: i },
        update: { ordem: i },
      });
      totalVariacoes++;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-demo] ${especMap.size} especificações e ${totalVariacoes} variações garantidas.`);

  // 3. Modelos + associações com especificações
  let modelosCriados = 0;
  let associacoes = 0;
  for (const m of MODELOS) {
    const linhaId = linhaMap.get(m.linha);
    if (!linhaId) {
      // eslint-disable-next-line no-console
      console.warn(`[seed-demo] Linha "${m.linha}" não encontrada para modelo "${m.nome}" — pulando.`);
      continue;
    }

    const modelo = await prisma.modelo.upsert({
      where: { linhaId_nome: { linhaId, nome: m.nome } },
      create: { linhaId, nome: m.nome, descricao: m.descricao },
      update: { descricao: m.descricao },
    });
    modelosCriados++;

    for (let i = 0; i < m.especificacoes.length; i++) {
      const e = m.especificacoes[i];
      const especificacaoId = especMap.get(e.nome);
      if (!especificacaoId) {
        // eslint-disable-next-line no-console
        console.warn(`[seed-demo] Especificação "${e.nome}" não encontrada (modelo "${m.nome}").`);
        continue;
      }
      await prisma.modeloEspecificacao.upsert({
        where: { modeloId_especificacaoId: { modeloId: modelo.id, especificacaoId } },
        create: {
          modeloId: modelo.id,
          especificacaoId,
          obrigatorio: e.obrigatorio ?? false,
          ordem: i,
        },
        update: { obrigatorio: e.obrigatorio ?? false, ordem: i },
      });
      associacoes++;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-demo] ${modelosCriados} modelos garantidos com ${associacoes} associações de especificação.`);

  // eslint-disable-next-line no-console
  console.log('[seed-demo] ✅ Concluído.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[seed-demo] Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
