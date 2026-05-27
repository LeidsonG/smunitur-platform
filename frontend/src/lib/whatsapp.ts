// ATENÇÃO: Número temporário para ambiente de testes.
// Substituir pelo número oficial da empresa SM Unitur antes de ir para produção.
export const WHATSAPP_NUMBER = '5517981322215';

interface DadosOrcamento {
  numero: number;
  nomeCliente: string;
  telefoneCliente: string;
  emailCliente: string;
  cpfCnpj?: string;
  linha?: string;
  modeloDesejado: string;
  quantidade: number;
  tamanhos?: string;
  cores?: string;
  especificacoes?: string;
  detalhes?: string;
  observacoes?: string;
}

export function gerarLinkWhatsApp(dados: DadosOrcamento): string {
  const data = new Date().toLocaleDateString('pt-BR');

  // "PP: 5, P: 10, M: 20" → uma linha por tamanho
  const linhasTamanhos = dados.tamanhos
    ? dados.tamanhos.split(',').map(s => s.trim()).filter(Boolean).map(s => `    ${s}`)
    : [];

  // Especificacoes já vêm separados por \n
  const linhasEspec = dados.especificacoes
    ? dados.especificacoes.split('\n').map(s => `  ${s.trim()}`).filter(s => s.trim())
    : [];

  const partes: (string | null)[] = [
    `*Solicitação de Orçamento — SM Unitur*`,
    `Nº *#${dados.numero}* | ${data}`,
    ``,
    `*Dados do Cliente*`,
    `  Nome: ${dados.nomeCliente}`,
    `  Telefone: ${dados.telefoneCliente}`,
    `  E-mail: ${dados.emailCliente}`,
    dados.cpfCnpj ? `  CPF/CNPJ: ${dados.cpfCnpj}` : null,
    ``,
    `*Modelo Solicitado*`,
    dados.linha ? `  Tipo de peça: *${dados.linha}*` : null,
    `  Material / modelo: *${dados.modeloDesejado}*`,
    dados.quantidade > 0 ? `  Quantidade total: *${dados.quantidade} peças*` : null,
  ];

  if (linhasTamanhos.length > 0) {
    partes.push(`  Tamanhos:`);
    linhasTamanhos.forEach(l => partes.push(l));
  }

  if (dados.cores) {
    partes.push(`  Cores: ${dados.cores}`);
  }

  if (linhasEspec.length > 0) {
    partes.push(``);
    partes.push(`*Especificações do Modelo*`);
    linhasEspec.forEach(l => partes.push(l));
  }

  if (dados.detalhes) {
    partes.push(``);
    partes.push(`*Detalhes de Personalização*`);
    partes.push(`  ${dados.detalhes}`);
  }

  if (dados.observacoes) {
    partes.push(``);
    partes.push(`*Observações*`);
    partes.push(`  ${dados.observacoes}`);
  }

  partes.push(``);
  partes.push(`_Mensagem gerada automaticamente pelo sistema SM Unitur._`);
  partes.push(`_Responda esta mensagem para confirmar o atendimento._`);

  const texto = partes
    .filter((l): l is string => l !== null)
    .join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
}

/**
 * Gera o link do WhatsApp para o botão "Outros" do formulário de orçamento.
 * Abre uma conversa com mensagem pré-formatada para o cliente descrever o
 * produto que deseja, sem precisar preencher o formulário completo.
 */
export function gerarLinkWhatsAppOutros(): string {
  const texto = [
    `Olá, SM Unitur!`,
    ``,
    `Gostaria de solicitar um orçamento para um produto que não encontrei entre os modelos disponíveis no site.`,
    ``,
    `*Tipo de produto:* "descreva aqui o que você precisa"`,
    `*Quantidade aproximada:* "ex: 50 peças"`,
    `*Observações:* `,
    `Vocês trabalham com esse tipo?`,
    ``,
    `Aguardo o retorno. Obrigado(a)!`,
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
}
