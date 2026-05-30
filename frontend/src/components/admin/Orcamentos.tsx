'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, X, DollarSign, Upload, MessageCircle, Loader2 } from 'lucide-react';
import api, { API_BASE } from '@/lib/api';
import { STATUS_LIST, STATUS_COLOR, STATUS_LABEL } from '@/lib/orcamentoStatus';

// Opções do <select> do filtro: "Todos" + a lista canônica importada.
const FILTRO_STATUS = [{ value: '', label: 'Todos' }, ...STATUS_LIST];

interface Orcamento {
  id: number; numero: number; nomeCliente: string; emailCliente: string;
  telefoneCliente: string; modeloDesejado: string; quantidade: number;
  status: string; createdAt: string; tamanhos?: string; cores?: string;
  detalhes?: string; observacoes?: string; cpfCnpj?: string;
  imagemReferencia?: string; layoutFinal?: string | null; valor?: number | null;
}

interface EspecificacaoOrc {
  id: number;
  modeloEspecificacao?: { especificacao?: { nome: string } } | null;
  variacao?: { valor: string } | null;
  valorLivre?: string | null;
}

export default function OrcamentosAdmin() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<Orcamento | null>(null);
  const [especs, setEspecs] = useState<EspecificacaoOrc[]>([]);
  const [novoStatus, setNovoStatus] = useState('');
  const [obs, setObs] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [novoValor, setNovoValor] = useState('');
  const [salvandoValor, setSalvandoValor] = useState(false);
  const [uploadingLayout, setUploadingLayout] = useState(false);
  const layoutInputRef = useRef<HTMLInputElement>(null);

  const limite = 15;

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pagina: String(pagina), limite: String(limite) });
      if (busca) params.set('busca', busca);
      if (status) params.set('status', status);
      const res = await api.get(`/orcamentos?${params}`);
      setOrcamentos(res.data.orcamentos);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [pagina, busca, status]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirModal = async (o: Orcamento) => {
    setSelecionado(o);
    setNovoStatus(o.status);
    setNovoValor(o.valor != null ? String(o.valor) : '');
    // Busca o detalhe completo para exibir as especificações escolhidas pelo
    // cliente (a listagem não as traz).
    setEspecs([]);
    try {
      const res = await api.get(`/orcamentos/${o.id}`);
      setEspecs(res.data.orcamento.especificacoesOrcament ?? []);
    } catch { /* detalhe é complementar — ignora falha */ }
  };

  const salvarValor = async () => {
    if (!selecionado) return;
    setSalvandoValor(true);
    try {
      const res = await api.patch(`/orcamentos/${selecionado.id}/valor`, { valor: novoValor === '' ? null : novoValor });
      const valorAtualizado = res.data.orcamento.valor;
      setOrcamentos(prev => prev.map(o => o.id === selecionado.id ? { ...o, valor: valorAtualizado } : o));
      setSelecionado({ ...selecionado, valor: valorAtualizado });
    } finally { setSalvandoValor(false); }
  };

  const enviarLayoutFinal = async (file: File) => {
    if (!selecionado) return;
    setUploadingLayout(true);
    try {
      const fd = new FormData();
      fd.append('layout', file);
      const res = await api.put(`/orcamentos/${selecionado.id}/layout-final`, fd);
      const novoLayout: string = res.data.orcamento.layoutFinal;
      setOrcamentos((prev) => prev.map((o) => o.id === selecionado.id ? { ...o, layoutFinal: novoLayout } : o));
      setSelecionado({ ...selecionado, layoutFinal: novoLayout });
    } finally {
      setUploadingLayout(false);
      if (layoutInputRef.current) layoutInputRef.current.value = '';
    }
  };

  // Abre o WhatsApp Web/App pré-preenchido com link público do layout final.
  // Telefones aceitos: com ou sem máscara; prepende 55 (BR) se não tiver código.
  const enviarPorWhatsApp = () => {
    if (!selecionado?.layoutFinal) return;
    const digits = selecionado.telefoneCliente.replace(/\D/g, '');
    const telefone = digits.startsWith('55') ? digits : `55${digits}`;
    const origem = window.location.origin;
    const linkImagem = `${origem}${selecionado.layoutFinal}`;
    const linkAcompanhar = `${origem}/#acompanhar`;

    const valorNum = selecionado.valor != null ? Number(selecionado.valor) : null;
    const valorFormatado = valorNum != null && !isNaN(valorNum)
      ? valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null;

    const partes: (string | null)[] = [
      `Olá, ${selecionado.nomeCliente}.`,
      ``,
      `Segue o layout final do seu orçamento *#${selecionado.numero}*.`,
      ``,
      `*Modelo:* ${selecionado.modeloDesejado}`,
      `*Quantidade:* ${selecionado.quantidade} peças`,
      valorFormatado ? `*Valor:* ${valorFormatado}` : null,
      ``,
      `*Visualizar layout:* ${linkImagem}`,
      `*Acompanhar status:* ${linkAcompanhar} (informe o n° *#${selecionado.numero}* e o e-mail cadastrado)`,
      ``,
      `Qualquer ajuste, é só responder por aqui.`,
      `— Equipe SM Unitur`,
    ];

    const msg = partes.filter((l): l is string => l !== null).join('\n');
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const atualizarStatus = async () => {
    if (!selecionado || !novoStatus) return;
    setAtualizando(true);
    try {
      await api.patch(`/orcamentos/${selecionado.id}/status`, { status: novoStatus, observacao: obs });
      setOrcamentos((prev) =>
        prev.map((o) => o.id === selecionado.id ? { ...o, status: novoStatus } : o)
      );
      setSelecionado({ ...selecionado, status: novoStatus });
      setObs('');
    } finally {
      setAtualizando(false);
    }
  };

  const totalPaginas = Math.ceil(total / limite);

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <p className="text-gray-500 text-sm mt-1">{total} orçamento{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            placeholder="Buscar por nome, e-mail ou número..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPagina(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white"
        >
          {FILTRO_STATUS.map((o) => <option key={o.value || 'todos'} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
          </div>
        ) : orcamentos.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-sm">Nenhum orçamento encontrado</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['#', 'Cliente', 'Modelo', 'Qtd', 'Status', 'Data', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orcamentos.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-700">#{o.numero}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-32">{o.nomeCliente}</div>
                      <div className="text-xs text-gray-400 truncate max-w-32">{o.emailCliente}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 truncate max-w-32">{o.modeloDesejado}</td>
                    <td className="px-4 py-3 text-gray-700">{o.quantidade}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ background: `${STATUS_COLOR[o.status]}18`, color: STATUS_COLOR[o.status] }}
                      >
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => abrirModal(o)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        style={{ color: '#005ED5' }}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalhe */}
      {selecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Orçamento #{selecionado.numero}</h2>
              <button onClick={() => setSelecionado(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <InfoRow label="Cliente" value={selecionado.nomeCliente} />
              <InfoRow label="E-mail" value={selecionado.emailCliente} />
              <InfoRow label="Telefone" value={selecionado.telefoneCliente} />
              {selecionado.cpfCnpj && <InfoRow label="CPF/CNPJ" value={selecionado.cpfCnpj} />}
              <InfoRow label="Modelo" value={selecionado.modeloDesejado} />
              <InfoRow label="Quantidade" value={`${selecionado.quantidade} unidades`} />
              {selecionado.tamanhos && <InfoRow label="Tamanhos" value={selecionado.tamanhos} />}
              {selecionado.cores && <InfoRow label="Cores" value={selecionado.cores} />}
              {selecionado.detalhes && <InfoRow label="Detalhes" value={selecionado.detalhes} />}
              {selecionado.observacoes && <InfoRow label="Observações" value={selecionado.observacoes} />}

              {/* Especificações escolhidas pelo cliente */}
              {especs.length > 0 && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Especificações escolhidas
                  </label>
                  <div className="space-y-2">
                    {especs.map((e) => (
                      <InfoRow
                        key={e.id}
                        label={e.modeloEspecificacao?.especificacao?.nome ?? 'Especificação'}
                        value={e.variacao?.valor ?? e.valorLivre ?? '—'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Valor do orçamento */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Valor do Orçamento
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={novoValor}
                      onChange={e => setNovoValor(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <button
                    onClick={salvarValor}
                    disabled={salvandoValor}
                    className="px-4 py-2 rounded-xl font-semibold text-white text-sm flex items-center gap-1.5 disabled:opacity-50 transition-all hover:scale-[1.02]"
                    style={{ background: '#10B981' }}
                  >
                    <DollarSign size={14} />
                    {salvandoValor ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
                {selecionado.valor != null && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Valor atual: <span className="font-semibold text-gray-600">
                      {Number(selecionado.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </p>
                )}
              </div>

              {/* Layout final */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Layout Final
                </label>
                {selecionado.layoutFinal ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${API_BASE}${selecionado.layoutFinal}`}
                      alt="Layout final"
                      className="w-full max-h-64 object-contain rounded-xl border border-gray-100 bg-gray-50"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => layoutInputRef.current?.click()}
                        disabled={uploadingLayout}
                        className="py-2 px-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {uploadingLayout ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        {uploadingLayout ? 'Enviando...' : 'Trocar imagem'}
                      </button>
                      <button
                        type="button"
                        onClick={enviarPorWhatsApp}
                        className="py-2 px-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
                        style={{ background: '#25D366' }}
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => layoutInputRef.current?.click()}
                    disabled={uploadingLayout}
                    className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {uploadingLayout ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploadingLayout ? 'Enviando...' : 'Anexar layout final'}
                  </button>
                )}
                <input
                  ref={layoutInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) enviarLayoutFinal(f);
                  }}
                />
              </div>

              <div className="border-t border-gray-100 pt-4 mt-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Atualizar Status
                </label>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-blue-400 bg-white"
                >
                  {/* "recebido" é o estado inicial — não faz sentido voltar para ele manualmente */}
                  {STATUS_LIST.filter((o) => o.value !== 'recebido').map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Observação sobre a mudança (opcional)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-blue-400 resize-none"
                />
                <button
                  onClick={atualizarStatus}
                  disabled={atualizando || novoStatus === selecionado.status}
                  className="w-full py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: '#005ED5' }}
                >
                  {atualizando ? 'Salvando...' : 'Salvar Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 min-w-24">{label}:</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
