/**
 * Seed de demonstração: popula o banco com dados realistas de confecção
 * (linhas, modelos, especificações, variações e orçamentos de exemplo) para
 * uso em desenvolvimento.
 *
 * Uso: npm run db:seed:demo
 *
 * Idempotente — pode rodar várias vezes sem duplicar (usa upsert por
 * nome/slug). Orçamentos são identificados pelo `numero` único: se já
 * existir, são pulados (não sobrescritos), preservando dados manuais
 * eventualmente criados no admin.
 *
 * NÃO usar em produção; é apenas para popular ambiente local de testes.
 * O seed de produção (`seed.ts`) continua criando apenas o usuário admin
 * inicial.
 */
import { PrismaClient, StatusOrcamento } from '@prisma/client';

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
// Cada linha tem uma cor de marca e um ícone Lucide (curados na lista do
// frontend em `lib/linhaIcones.ts`).

const LINHAS: Array<{ nome: string; cor: string; icone: string }> = [
  { nome: 'Camisetas',            cor: '#005ED5', icone: 'Shirt' },
  { nome: 'Polos',                cor: '#7C3AED', icone: 'Briefcase' },
  { nome: 'Moletons',             cor: '#0EA5E9', icone: 'Wind' },
  { nome: 'Jalecos e Aventais',   cor: '#10B981', icone: 'FlaskConical' },
  { nome: 'Uniformes Esportivos', cor: '#FF9400', icone: 'Trophy' },
];

// ─── Especificações + Variações ─────────────────────────────────────────────
//
// NOTA: "Tamanho" NÃO entra aqui de propósito. O tamanho do pedido é
// resolvido em uma etapa dedicada do formulário de orçamento (cliente
// escolhe quais tamanhos quer e a quantidade de cada). Especificações ficam
// reservadas para atributos estruturais do modelo (tecido, gola, manga,
// cor predominante, estampa, etc.).

const ESPECIFICACOES: Array<{
  nome: string;
  ordem: number;
  variacoes: string[];
}> = [
  { nome: 'Tipo de Gola',    ordem: 1, variacoes: ['Careca', 'Polo', 'V', 'Henley'] },
  { nome: 'Tecido',          ordem: 2, variacoes: ['PV (Poliviscose)', '100% Algodão', 'Dry Fit', 'Moletom Flanelado', 'Oxford', 'Microfibra'] },
  { nome: 'Manga',           ordem: 3, variacoes: ['Curta', 'Longa', 'Cavada (Regata)', '3/4'] },
  { nome: 'Cor Principal',   ordem: 4, variacoes: ['Branco', 'Preto', 'Azul Marinho', 'Cinza Mescla', 'Vermelho', 'Verde Bandeira', 'Amarelo', 'Rosa', 'Bege'] },
  { nome: 'Tipo de Estampa', ordem: 5, variacoes: ['Silk Screen', 'Sublimação', 'Bordado', 'Termocolante', 'Sem estampa'] },
  { nome: 'Bolso',           ordem: 6, variacoes: ['Sem bolso', 'Bolso frontal', 'Bolso lateral', 'Dois bolsos'] },
  { nome: 'Punho',           ordem: 7, variacoes: ['Sem punho', 'Ribana', 'Elástico'] },
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
      { nome: 'Tipo de Estampa', obrigatorio: true },
    ],
  },
  {
    linha: 'Uniformes Esportivos',
    nome: 'Shorts Esportivo',
    descricao: 'Shorts em dry fit com elástico e cordão. Combina com camisas esportivas.',
    especificacoes: [
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tipo de Estampa' },
    ],
  },
  {
    linha: 'Uniformes Esportivos',
    nome: 'Conjunto Bermuda e Camisa',
    descricao: 'Kit conjunto camiseta + bermuda em dry fit. Personalização de número e nome incluída.',
    especificacoes: [
      { nome: 'Cor Principal', obrigatorio: true },
      { nome: 'Tipo de Estampa', obrigatorio: true },
    ],
  },
];

// ─── Orçamentos de exemplo ─────────────────────────────────────────────────
//
// Cada orçamento define:
//   - `modeloDesejadoNome`: nome de um modelo cadastrado (usado para anexar
//      especificações via OrcamentoEspecificacao quando o status já indica
//      que a equipe processou o pedido).
//   - `diasAtras`: createdAt = hoje - N dias. Status mais avançados ficam
//      naturalmente mais antigos.
//   - `especs`: pares (nome da especificação, valor da variação) que o
//      cliente teria escolhido no formulário. O seed resolve os IDs.

const ORCAMENTOS: Array<{
  numero: number;
  nomeCliente: string;
  emailCliente: string;
  telefoneCliente: string;
  cpfCnpj?: string;
  modeloDesejadoNome: string;
  quantidade: number;
  tamanhos?: string;
  cores?: string;
  detalhes?: string;
  observacoes?: string;
  valor?: number;
  status: StatusOrcamento;
  diasAtras: number;
  especs?: Array<{ nome: string; variacao: string }>;
}> = [
  {
    numero: 101,
    nomeCliente: 'Lanchonete do Zé',
    emailCliente: 'contato@lanchezé.com.br',
    telefoneCliente: '(11) 99876-5432',
    modeloDesejadoNome: 'Avental de Cintura',
    quantidade: 6,
    cores: 'Preto com logo bordada em branco',
    detalhes: 'Avental simples para a equipe de atendimento. Logo no peito.',
    status: 'cancelado',
    diasAtras: 18,
    observacoes: 'Cliente desistiu — orçamento de concorrente foi menor.',
  },
  {
    numero: 102,
    nomeCliente: 'Empresa Construsul Engenharia',
    emailCliente: 'compras@construsul.com.br',
    telefoneCliente: '(11) 3322-4455',
    cpfCnpj: '12.345.678/0001-90',
    modeloDesejadoNome: 'Camiseta Básica Algodão',
    quantidade: 50,
    tamanhos: '10 P, 20 M, 15 G, 5 GG',
    cores: 'Azul Marinho com logo branca no peito esquerdo',
    detalhes: 'Camisetas para equipe de obras. Logo bordada (não silk).',
    status: 'recebido',
    diasAtras: 1,
    especs: [
      { nome: 'Tipo de Gola', variacao: 'Careca' },
      { nome: 'Manga', variacao: 'Curta' },
      { nome: 'Cor Principal', variacao: 'Azul Marinho' },
      { nome: 'Tipo de Estampa', variacao: 'Bordado' },
    ],
  },
  {
    numero: 103,
    nomeCliente: 'Maria Silva Oliveira',
    emailCliente: 'maria.oliveira@gmail.com',
    telefoneCliente: '(11) 98765-4321',
    cpfCnpj: '123.456.789-00',
    modeloDesejadoNome: 'Polo Premium Algodão',
    quantidade: 25,
    tamanhos: '5 P, 10 M, 8 G, 2 GG',
    cores: 'Branca com bordado em azul',
    valor: 1875.00,
    status: 'em_analise',
    diasAtras: 3,
    observacoes: 'Aguardando confirmação de tonalidade de azul.',
    especs: [
      { nome: 'Manga', variacao: 'Curta' },
      { nome: 'Cor Principal', variacao: 'Branco' },
      { nome: 'Tipo de Estampa', variacao: 'Bordado' },
      { nome: 'Bolso', variacao: 'Sem bolso' },
    ],
  },
  {
    numero: 104,
    nomeCliente: 'Escola Aprender Mais',
    emailCliente: 'secretaria@aprendermais.edu.br',
    telefoneCliente: '(11) 4422-3311',
    cpfCnpj: '98.765.432/0001-21',
    modeloDesejadoNome: 'Camiseta Premium Confort',
    quantidade: 120,
    tamanhos: '20 Infantil 8, 30 Infantil 10, 40 Infantil 12, 30 P',
    cores: 'Branco com logo da escola estampada',
    detalhes: 'Camisetas do uniforme escolar 2026. Necessária amostra antes de aprovar produção.',
    valor: 4800.00,
    status: 'aguardando_aprovacao',
    diasAtras: 6,
    observacoes: 'Amostra enviada via correio em 24/05. Aguardando feedback.',
    especs: [
      { nome: 'Tipo de Gola', variacao: 'Careca' },
      { nome: 'Manga', variacao: 'Curta' },
      { nome: 'Cor Principal', variacao: 'Branco' },
      { nome: 'Tipo de Estampa', variacao: 'Silk Screen' },
    ],
  },
  {
    numero: 105,
    nomeCliente: 'Academia FitMax',
    emailCliente: 'gerencia@fitmaxacademia.com',
    telefoneCliente: '(11) 95544-7788',
    cpfCnpj: '11.222.333/0001-44',
    modeloDesejadoNome: 'Camiseta Dry Fit Esportiva',
    quantidade: 80,
    tamanhos: '15 P, 25 M, 25 G, 15 GG',
    cores: 'Preta com detalhes em amarelo',
    detalhes: 'Camisetas para professores e equipe de recepção.',
    valor: 3920.00,
    status: 'em_producao',
    diasAtras: 10,
    observacoes: 'Layout final aprovado pelo cliente. Produção em andamento.',
    especs: [
      { nome: 'Tipo de Gola', variacao: 'V' },
      { nome: 'Manga', variacao: 'Curta' },
      { nome: 'Cor Principal', variacao: 'Preto' },
      { nome: 'Tipo de Estampa', variacao: 'Sublimação' },
    ],
  },
  {
    numero: 106,
    nomeCliente: 'Clínica Bem Estar',
    emailCliente: 'administracao@clinicabemestar.com.br',
    telefoneCliente: '(11) 3344-5566',
    cpfCnpj: '55.666.777/0001-88',
    modeloDesejadoNome: 'Jaleco Manga Longa',
    quantidade: 30,
    tamanhos: '8 P, 12 M, 8 G, 2 GG',
    cores: 'Branco com bordado azul (nome + função)',
    valor: 2250.00,
    status: 'finalizado',
    diasAtras: 22,
    observacoes: 'Produção concluída. Aguardando retirada/envio.',
    especs: [
      { nome: 'Tecido', variacao: 'Microfibra' },
      { nome: 'Cor Principal', variacao: 'Branco' },
      { nome: 'Bolso', variacao: 'Dois bolsos' },
      { nome: 'Tipo de Estampa', variacao: 'Bordado' },
    ],
  },
  {
    numero: 107,
    nomeCliente: 'Time Águia FC',
    emailCliente: 'diretoria@aguiafc.com',
    telefoneCliente: '(11) 97766-8899',
    modeloDesejadoNome: 'Camisa de Futebol',
    quantidade: 22,
    tamanhos: '5 P, 10 M, 5 G, 2 GG',
    cores: 'Azul e branco (listras verticais)',
    detalhes: 'Camisa oficial do time amador. Sublimação total com escudo, números e patrocinadores.',
    valor: 1980.00,
    status: 'enviado',
    diasAtras: 35,
    observacoes: 'Entregue ao cliente em 22/04. Cliente satisfeito.',
    especs: [
      { nome: 'Tipo de Gola', variacao: 'V' },
      { nome: 'Cor Principal', variacao: 'Azul Marinho' },
      { nome: 'Tipo de Estampa', variacao: 'Sublimação' },
    ],
  },
];

// Observação inicial padrão (igual ao backend em routes/orcamentos.ts)
const OBS_INICIAL = 'Orçamento recebido pelo sistema';

// Observação para a entrada de histórico do status atual (quando != recebido).
const OBS_POR_STATUS: Partial<Record<StatusOrcamento, string>> = {
  em_analise: 'Equipe iniciou análise técnica do pedido',
  aguardando_aprovacao: 'Proposta enviada ao cliente — aguardando aprovação',
  em_producao: 'Cliente aprovou orçamento. Produção iniciada',
  finalizado: 'Produção concluída',
  enviado: 'Pedido entregue ao cliente',
  cancelado: 'Orçamento cancelado',
};

// ─── Execução ───────────────────────────────────────────────────────────────

async function main() {
  // eslint-disable-next-line no-console
  console.log('[seed-demo] Iniciando seed de demonstração…');

  // 1. Linhas
  const linhaMap = new Map<string, number>();
  for (const l of LINHAS) {
    const linha = await prisma.linha.upsert({
      where: { nome: l.nome },
      create: { nome: l.nome, slug: slug(l.nome), cor: l.cor, icone: l.icone },
      update: { cor: l.cor, icone: l.icone, ativo: true },
    });
    linhaMap.set(l.nome, linha.id);
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-demo] ${linhaMap.size} linhas garantidas.`);

  // 2. Especificações + variações
  const especMap = new Map<string, number>();
  // Guarda os IDs de variação por especificacaoId para habilitar tudo nos modelos
  const variacaoIdsMap = new Map<number, number[]>();
  let totalVariacoes = 0;
  for (const e of ESPECIFICACOES) {
    const espec = await prisma.especificacao.upsert({
      where: { nome: e.nome },
      create: { nome: e.nome, ordem: e.ordem },
      update: { ordem: e.ordem, ativo: true },
    });
    especMap.set(e.nome, espec.id);
    variacaoIdsMap.set(espec.id, []);

    for (let i = 0; i < e.variacoes.length; i++) {
      const variacao = await prisma.modeloVariacao.upsert({
        where: { especificacaoId_valor: { especificacaoId: espec.id, valor: e.variacoes[i] } },
        create: { especificacaoId: espec.id, valor: e.variacoes[i], ordem: i },
        update: { ordem: i },
      });
      variacaoIdsMap.get(espec.id)!.push(variacao.id);
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
      update: { descricao: m.descricao, ativo: true },
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
      const modeloEspec = await prisma.modeloEspecificacao.upsert({
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

      // Habilitar todas as variações desta especificação para este modelo
      const variacaoIds = variacaoIdsMap.get(especificacaoId) ?? [];
      for (const variacaoId of variacaoIds) {
        await prisma.modeloEspecificacaoVariacao.upsert({
          where: {
            modeloEspecificacaoId_variacaoId: {
              modeloEspecificacaoId: modeloEspec.id,
              variacaoId,
            },
          },
          create: { modeloEspecificacaoId: modeloEspec.id, variacaoId },
          update: {},
        });
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-demo] ${modelosCriados} modelos garantidos com ${associacoes} associações de especificação.`);

  // 4. Orçamentos de exemplo
  let orcamentosCriados = 0;
  let orcamentosPulados = 0;
  for (const o of ORCAMENTOS) {
    const existente = await prisma.orcamento.findUnique({
      where: { numero: o.numero },
      select: { id: true },
    });
    if (existente) {
      orcamentosPulados++;
      continue;
    }

    const createdAt = new Date(Date.now() - o.diasAtras * 24 * 60 * 60 * 1000);

    const orcamento = await prisma.orcamento.create({
      data: {
        numero: o.numero,
        nomeCliente: o.nomeCliente,
        emailCliente: o.emailCliente,
        telefoneCliente: o.telefoneCliente,
        cpfCnpj: o.cpfCnpj ?? null,
        modeloDesejado: o.modeloDesejadoNome,
        quantidade: o.quantidade,
        tamanhos: o.tamanhos ?? null,
        cores: o.cores ?? null,
        detalhes: o.detalhes ?? null,
        observacoes: o.observacoes ?? null,
        valor: o.valor ?? null,
        status: o.status,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Especificações selecionadas pelo cliente
    if (o.especs && o.especs.length > 0) {
      const modelo = await prisma.modelo.findFirst({
        where: { nome: o.modeloDesejadoNome },
        select: { id: true },
      });
      if (modelo) {
        for (const e of o.especs) {
          const especificacaoId = especMap.get(e.nome);
          if (!especificacaoId) continue;

          const modeloEspec = await prisma.modeloEspecificacao.findUnique({
            where: { modeloId_especificacaoId: { modeloId: modelo.id, especificacaoId } },
            select: { id: true },
          });
          const variacao = await prisma.modeloVariacao.findUnique({
            where: { especificacaoId_valor: { especificacaoId, valor: e.variacao } },
            select: { id: true },
          });
          if (!modeloEspec) continue;

          await prisma.orcamentoEspecificacao.create({
            data: {
              orcamentoId: orcamento.id,
              modeloEspecificacaoId: modeloEspec.id,
              variacaoId: variacao?.id ?? null,
              valorLivre: e.variacao,
            },
          });
        }
      }
    }

    // Histórico: inicial sempre, e final se status mudou de 'recebido'
    await prisma.orcamentoStatusHistorico.create({
      data: {
        orcamentoId: orcamento.id,
        statusNovo: 'recebido',
        observacao: OBS_INICIAL,
        createdAt,
      },
    });
    if (o.status !== 'recebido') {
      const obs = OBS_POR_STATUS[o.status] ?? `Status atualizado para ${o.status}`;
      // Histórico do status atual: tempo proporcional aos diasAtras (entre
      // 25% e 75% do período do orçamento, para parecer um fluxo plausível).
      const horasParaTransicao = Math.max(2, o.diasAtras * 12);
      const dataTransicao = new Date(createdAt.getTime() + horasParaTransicao * 60 * 60 * 1000);
      await prisma.orcamentoStatusHistorico.create({
        data: {
          orcamentoId: orcamento.id,
          statusAnterior: 'recebido',
          statusNovo: o.status,
          observacao: obs,
          createdAt: dataTransicao,
        },
      });
    }
    orcamentosCriados++;
  }
  // eslint-disable-next-line no-console
  console.log(`[seed-demo] ${orcamentosCriados} orçamentos criados, ${orcamentosPulados} pulados (já existiam).`);

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
