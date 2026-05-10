// ATENÇÃO: Número temporário para ambiente de testes.
// Substituir pelo número oficial da empresa SM Unitur antes de ir para produção.
const WHATSAPP_NUMBER = '5517981322215';

interface DadosOrcamento {
  numero: number;
  nomeCliente: string;
  telefoneCliente: string;
  emailCliente: string;
  cpfCnpj?: string;
  produtoDesejado: string;
  quantidade: number;
  tamanhos?: string;
  cores?: string;
  detalhes?: string;
  observacoes?: string;
}

export function gerarLinkWhatsApp(dados: DadosOrcamento): string {
  const linhas = [
    `🧵 *Novo Orçamento — SM Unitur*`,
    ``,
    `📋 *Nº do Orçamento:* ${dados.numero}`,
    ``,
    `👤 *Dados do Cliente*`,
    `• Nome: ${dados.nomeCliente}`,
    `• Telefone: ${dados.telefoneCliente}`,
    `• E-mail: ${dados.emailCliente}`,
    dados.cpfCnpj ? `• CPF/CNPJ: ${dados.cpfCnpj}` : null,
    ``,
    `🎽 *Dados do Pedido*`,
    `• Produto: ${dados.produtoDesejado}`,
    `• Quantidade: ${dados.quantidade} unidades`,
    dados.tamanhos ? `• Tamanhos: ${dados.tamanhos}` : null,
    dados.cores ? `• Cores: ${dados.cores}` : null,
    dados.detalhes ? `• Detalhes: ${dados.detalhes}` : null,
    dados.observacoes ? `• Observações: ${dados.observacoes}` : null,
    ``,
    `📅 Aguardando retorno da nossa equipe!`,
    ``,
    `_Sistema SM Unitur_`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const encoded = encodeURIComponent(linhas);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}
