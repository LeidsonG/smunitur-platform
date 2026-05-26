'use client';

/**
 * Página /admin/modelos
 * --------------------------------------------------------------------------
 * CRUD de modelos + gestão de quais especificacoes (e quais opções de cada
 * especificacao) cada modelo expõe ao cliente no formulário de orçamento.
 *
 * Linhas são apenas LISTADAS aqui (necessárias para criar/editar
 * modelo). O CRUD completo de linhas vive em /admin/linhas —
 * para evitar duas fontes de verdade na UI.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X,
  Upload, Loader2, ChevronDown, Check, Link2, Link2Off, Tag, ExternalLink, Copy,
} from 'lucide-react';
import api, { API_BASE } from '@/lib/api';
import ConfirmModal from '@/components/admin/ConfirmModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Linha { id: number; nome: string; slug: string; ativo: boolean }
interface VariacaoGlobal { id: number; valor: string }
interface EspecificacaoGlobal { id: number; nome: string; variacoes: VariacaoGlobal[] }

interface VariacaoModelo { id: number; valor: string }
interface EspecificacaoModelo {
  id: number;          // ModeloEspecificacao.id
  especificacaoId: number;  // Especificacao global.id
  nome: string;
  obrigatorio: boolean;
  variacoes: VariacaoModelo[]; // variacoes habilitadas para este modelo
}

interface Modelo {
  id: number; nome: string; descricao?: string; imagem?: string;
  ativo: boolean; linhaId: number; linha: Linha;
}

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado.';

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ModelosPage() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [especificaçõesGlobais, setEspecificaçõesGlobais] = useState<EspecificacaoGlobal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de confirmação genérico (compartilhado entre exclusão de modelo e
  // remoção de associação de especificacao).
  const [confirmar, setConfirmar] = useState<null | { titulo: string; mensagem: string; acao: () => Promise<void> }>(null);
  const [confirmCarregando, setConfirmCarregando] = useState(false);

  const pedirConfirmacao = (titulo: string, mensagem: string, acao: () => Promise<void>) =>
    setConfirmar({ titulo, mensagem, acao });

  const executarConfirmacao = async () => {
    if (!confirmar) return;
    setConfirmCarregando(true);
    try { await confirmar.acao(); } finally {
      setConfirmCarregando(false);
      setConfirmar(null);
    }
  };

  // Modal modelo
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null);
  const [editando, setEditando] = useState<Modelo | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', linha_id: '' });
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Expansão / especificacoes
  const [expandido, setExpandido] = useState<number | null>(null);
  const [especificaçõesPorModelo, setEspecificaçõesPorModelo] = useState<Record<number, EspecificacaoModelo[]>>({});

  // Painel "adicionar especificacao"
  const [adicionandoAtrib, setAdicionandoAtrib] = useState<number | null>(null); // modeloId
  const [especEscolhido, setAtribEscolhido] = useState<EspecificacaoGlobal | null>(null);
  const [variacoesSel, setOpcoesSel] = useState<Set<number>>(new Set());
  const [obrigNovo, setObrigNovo] = useState(false);
  const [criandoAssoc, setCriandoAssoc] = useState(false);
  const [erroAssoc, setErroAssoc] = useState<string | null>(null);

  // Painel "copiar especificacoes de outro modelo"
  const [copiandoPara, setCopiandoPara] = useState<number | null>(null); // modeloId destino
  const [origemEscolhido, setOrigemEscolhido] = useState<number | null>(null);
  const [copiandoEspecs, setCopiandoEspecs] = useState(false);
  const [erroCopiar, setErroCopiar] = useState<string | null>(null);
  const [resultadoCopia, setResultadoCopia] = useState<{ criadas: number; puladas: number } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, aRes] = await Promise.all([
        api.get('/modelos?apenasAtivos=false'),
        api.get('/linhas?todos=true'),
        api.get('/especificacoes'),
      ]);
      setModelos(pRes.data.modelos);
      setLinhas(cRes.data.linhas);
      setEspecificaçõesGlobais(aRes.data.especificacoes);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Carrega especificacoes ao expandir modelo
  const expandirModelo = async (id: number) => {
    if (expandido === id) { setExpandido(null); return; }
    setExpandido(id);
    setAdicionandoAtrib(null);
    if (!especificaçõesPorModelo[id]) {
      const res = await api.get(`/modelos/${id}/especificacoes`);
      setEspecificaçõesPorModelo(prev => ({ ...prev, [id]: res.data.especificacoes }));
    }
  };

  const setEspecificações = (modeloId: number, fn: (a: EspecificacaoModelo[]) => EspecificacaoModelo[]) =>
    setEspecificaçõesPorModelo(prev => ({ ...prev, [modeloId]: fn(prev[modeloId] ?? []) }));

  // ── CRUD modelo ─────────────────────────────────────────────────────────────
  const abrirCriar = () => {
    setEditando(null);
    setForm({ nome: '', descricao: '', linha_id: linhas[0]?.id.toString() || '' });
    setImagem(null); setErroModal(null); setModal('criar');
  };

  const abrirEditar = (p: Modelo) => {
    setEditando(p);
    setForm({ nome: p.nome, descricao: p.descricao || '', linha_id: String(p.linhaId) });
    setImagem(null); setErroModal(null); setModal('editar');
  };

  const salvar = async () => {
    setSalvando(true); setErroModal(null);
    try {
      const fd = new FormData();
      fd.append('nome', form.nome);
      fd.append('descricao', form.descricao);
      fd.append('linha_id', form.linha_id);
      if (imagem) fd.append('imagem', imagem);
      if (modal === 'criar') {
        await api.post('/modelos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (editando) {
        await api.put(`/modelos/${editando.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setModal(null); await carregar();
    } catch (e) {
      setErroModal(errMsg(e));
    } finally { setSalvando(false); }
  };

  const toggleAtivo = async (p: Modelo) => {
    await api.patch(`/modelos/${p.id}/toggle`);
    setModelos(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
  };

  const excluirModelo = async (p: Modelo) => {
    pedirConfirmacao(
      'Excluir Modelo',
      `Tem certeza que quer excluir "${p.nome}"? Esta ação não pode ser desfeita.`,
      async () => {
        await api.delete(`/modelos/${p.id}`);
        setModelos(prev => prev.filter(x => x.id !== p.id));
        if (expandido === p.id) setExpandido(null);
      }
    );
  };

  // ── Gerenciar associações de especificacoes ────────────────────────────────────────
  const abrirAdicionarAtrib = (modeloId: number) => {
    setAdicionandoAtrib(modeloId);
    setAtribEscolhido(null);
    setOpcoesSel(new Set());
    setObrigNovo(false);
    setErroAssoc(null);
  };

  const selecionarAtrib = (atrib: EspecificacaoGlobal) => {
    setAtribEscolhido(atrib);
    setOpcoesSel(new Set(atrib.variacoes.map(o => o.id)));
  };

  const toggleOpcaoSel = (id: number) => {
    setOpcoesSel(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const confirmarAssociacao = async (modeloId: number) => {
    if (!especEscolhido) return;
    setCriandoAssoc(true); setErroAssoc(null);
    try {
      const res = await api.post(`/modelos/${modeloId}/especificacoes`, {
        especificacao_id: especEscolhido.id,
        obrigatorio: obrigNovo,
        variacao_ids: Array.from(variacoesSel),
      });
      setEspecificações(modeloId, a => [...a, res.data.especificacao]);
      setAdicionandoAtrib(null);
    } catch (e) {
      setErroAssoc(errMsg(e));
    } finally { setCriandoAssoc(false); }
  };

  const removerAssociacao = (paId: number, modeloId: number) => {
    pedirConfirmacao(
      'Remover Especificacao',
      'Tem certeza que quer remover este especificacao do modelo?',
      async () => {
        await api.delete(`/modelos/${modeloId}/especificacoes/${paId}`);
        setEspecificações(modeloId, a => a.filter(x => x.id !== paId));
      }
    );
  };

  const toggleOpcaoModelo = async (pa: EspecificacaoModelo, variacaoId: number, modeloId: number) => {
    const jaAtivo = pa.variacoes.some(o => o.id === variacaoId);
    const novasOpcoes = jaAtivo
      ? pa.variacoes.filter(o => o.id !== variacaoId).map(o => o.id)
      : [...pa.variacoes.map(o => o.id), variacaoId];

    const res = await api.put(`/modelos/${modeloId}/especificacoes/${pa.id}`, {
      variacao_ids: novasOpcoes,
    });
    setEspecificações(modeloId, a => a.map(x => x.id === pa.id ? res.data.especificacao : x));
  };

  const toggleObrigatorio = async (pa: EspecificacaoModelo, modeloId: number) => {
    const res = await api.put(`/modelos/${modeloId}/especificacoes/${pa.id}`, {
      obrigatorio: !pa.obrigatorio,
    });
    setEspecificações(modeloId, a => a.map(x => x.id === pa.id ? res.data.especificacao : x));
  };

  // ── Copiar especificações de outro modelo ──────────────────────────────────
  const abrirCopiar = (modeloId: number) => {
    setCopiandoPara(modeloId);
    setAdicionandoAtrib(null);
    setOrigemEscolhido(null);
    setErroCopiar(null);
    setResultadoCopia(null);
  };

  const fecharCopiar = () => {
    setCopiandoPara(null);
    setOrigemEscolhido(null);
    setErroCopiar(null);
    setResultadoCopia(null);
  };

  const executarCopiar = async (destinoId: number) => {
    if (!origemEscolhido) return;
    setCopiandoEspecs(true);
    setErroCopiar(null);
    setResultadoCopia(null);
    try {
      const res = await api.post(`/modelos/${destinoId}/especificacoes/copiar`, {
        origem_id: origemEscolhido,
      });
      setEspecificações(destinoId, () => res.data.especificacoes);
      setResultadoCopia({ criadas: res.data.criadas, puladas: res.data.puladas });
      // Mantém o painel aberto ~1.5s com o resultado e depois fecha sozinho.
      setTimeout(fecharCopiar, 1800);
    } catch (e) {
      setErroCopiar(errMsg(e));
    } finally {
      setCopiandoEspecs(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {modelos.length} modelo{modelos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirCriar}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
          style={{ background: '#005ED5' }}>
          <Plus size={18} /> Novo Modelo
        </button>
      </div>

      {/*
        Painel resumo de linhas.
        Apenas listagem — para criar/editar/desativar, segue link para
        /admin/linhas (fonte da verdade única).
      */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <Tag size={16} style={{ color: '#005ED5' }} />
          <h2 className="font-semibold text-gray-900 text-sm">Linhas</h2>
          <span className="text-xs text-gray-400">
            {linhas.length} cadastrada{linhas.length !== 1 ? 's' : ''}
          </span>
          <Link
            href="/admin/linhas"
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
          >
            Gerenciar linhas <ExternalLink size={12} />
          </Link>
        </div>
        {linhas.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nenhuma linha cadastrada. <Link href="/admin/linhas" className="text-blue-600 hover:underline">Cadastre a primeira</Link> para criar modelos.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linhas.map(c => (
              <span key={c.id}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800">
                {c.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
        </div>
      ) : modelos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-semibold mb-2">Nenhum modelo cadastrado</p>
          <p className="text-sm">Clique em "Novo Modelo" para começar</p>
        </div>
      ) : (
        <div className="space-y-8">
          {linhas
            .filter(c => modelos.some(p => p.linhaId === c.id))
            .map(cat => (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-gray-700">{cat.nome}</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    {modelos.filter(p => p.linhaId === cat.id).length} modelo{modelos.filter(p => p.linhaId === cat.id).length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {modelos.filter(p => p.linhaId === cat.id).map(p => (
                    <div key={p.id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${p.ativo ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>

                      {/* Header do card */}
                      <div className="flex items-start gap-3 p-4 pb-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                          {p.imagem
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={`${API_BASE}${p.imagem}`} alt={p.nome} className="w-full h-full object-cover" />
                            : <span className="text-xl">🎽</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{p.nome}</p>
                          {p.descricao && <p className="text-xs text-gray-500 truncate mt-0.5">{p.descricao}</p>}
                        </div>
                        <button onClick={() => excluirModelo(p)}
                          className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Excluir modelo">
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1.5 px-4 pb-3">
                        <button onClick={() => toggleAtivo(p)}
                          className="flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            background: p.ativo ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.15)',
                            color: p.ativo ? '#10B981' : '#6B7280',
                          }}>
                          {p.ativo ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                        <div className="flex-1" />
                        <button onClick={() => abrirEditar(p)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                          title="Editar modelo">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => expandirModelo(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: expandido === p.id ? 'rgba(0,94,213,0.08)' : '#F3F4F6',
                            color: expandido === p.id ? '#005ED5' : '#6B7280',
                          }}>
                          <ChevronDown size={15} className={`transition-transform duration-200 ${expandido === p.id ? 'rotate-180' : ''}`} />
                          Especificacoes
                        </button>
                      </div>

                      {/* Painel de especificacoes */}
                      {expandido === p.id && (
                        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Especificacoes do Modelo</p>

                          {/* Especificacoes associados */}
                          {(especificaçõesPorModelo[p.id] ?? []).length === 0 && adicionandoAtrib !== p.id && (
                            <p className="text-sm text-gray-400">Nenhum especificacao associado.</p>
                          )}

                          {(especificaçõesPorModelo[p.id] ?? []).map(pa => {
                            const global = especificaçõesGlobais.find(a => a.id === pa.especificacaoId);
                            const todasOpcoes = global?.variacoes ?? [];
                            return (
                              <div key={pa.id} className="bg-white rounded-xl border border-gray-200 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-semibold text-gray-800 flex-1">{pa.nome}</span>
                                  <button
                                    onClick={() => toggleObrigatorio(pa, p.id)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${pa.obrigatorio ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'}`}
                                    title="Clique para alternar obrigatório">
                                    {pa.obrigatorio ? 'Obrig.' : 'Opcional'}
                                  </button>
                                  <button onClick={() => removerAssociacao(pa.id, p.id)}
                                    className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Remover especificacao do modelo">
                                    <Link2Off size={13} />
                                  </button>
                                </div>

                                {todasOpcoes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {todasOpcoes.map(variacao => {
                                      const ativa = pa.variacoes.some(o => o.id === variacao.id);
                                      return (
                                        <button key={variacao.id}
                                          onClick={() => toggleOpcaoModelo(pa, variacao.id, p.id)}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
                                          style={{
                                            background: ativa ? 'rgba(0,94,213,0.1)' : 'transparent',
                                            color: ativa ? '#005ED5' : '#9CA3AF',
                                            borderColor: ativa ? 'rgba(0,94,213,0.3)' : '#E5E7EB',
                                          }}>
                                          {ativa && <Check size={9} />}
                                          {variacao.valor}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">Sem opções cadastradas neste especificacao.</p>
                                )}
                              </div>
                            );
                          })}

                          {/* Painel copiar de outro modelo */}
                          {copiandoPara === p.id && (
                            <div className="bg-white rounded-xl border border-dashed border-blue-300 p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-600">Copiar especificações de outro modelo</p>
                                <button
                                  onClick={fecharCopiar}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                                  aria-label="Fechar"
                                >
                                  <X size={13} />
                                </button>
                              </div>

                              <select
                                value={origemEscolhido ?? ''}
                                onChange={e => setOrigemEscolhido(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={copiandoEspecs}
                                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white"
                              >
                                <option value="">Selecionar modelo de origem…</option>
                                {linhas.map(c => {
                                  const modelosLinha = modelos.filter(m => m.linhaId === c.id && m.id !== p.id);
                                  if (modelosLinha.length === 0) return null;
                                  return (
                                    <optgroup key={c.id} label={c.nome}>
                                      {modelosLinha.map(m => (
                                        <option key={m.id} value={m.id}>{m.nome}</option>
                                      ))}
                                    </optgroup>
                                  );
                                })}
                              </select>

                              {resultadoCopia && (
                                <div className="text-xs px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                                  <Check size={14} />
                                  <span>
                                    {resultadoCopia.criadas} {resultadoCopia.criadas === 1 ? 'especificação copiada' : 'especificações copiadas'}
                                    {resultadoCopia.puladas > 0 && (
                                      <> · {resultadoCopia.puladas} já {resultadoCopia.puladas === 1 ? 'estava' : 'estavam'} no modelo</>
                                    )}
                                  </span>
                                </div>
                              )}

                              {erroCopiar && <p className="text-xs text-red-500">{erroCopiar}</p>}

                              <p className="text-xs text-gray-400 leading-relaxed">
                                Apenas especificações ainda não associadas serão copiadas — as existentes neste modelo são preservadas.
                              </p>

                              <div className="flex gap-2">
                                <button
                                  onClick={fecharCopiar}
                                  disabled={copiandoEspecs}
                                  className="flex-1 py-2 rounded-xl text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => executarCopiar(p.id)}
                                  disabled={!origemEscolhido || copiandoEspecs || !!resultadoCopia}
                                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50 transition-all"
                                  style={{ background: '#005ED5' }}
                                >
                                  {copiandoEspecs ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                                  Copiar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Painel adicionar especificacao */}
                          {adicionandoAtrib === p.id ? (
                            <div className="bg-white rounded-xl border border-dashed border-blue-300 p-3 space-y-3">
                              <p className="text-xs font-semibold text-gray-600">Selecionar especificacao</p>

                              {/* Picker de especificacao */}
                              <div className="flex flex-wrap gap-2">
                                {especificaçõesGlobais
                                  .filter(ag => !(especificaçõesPorModelo[p.id] ?? []).some(pa => pa.especificacaoId === ag.id))
                                  .map(ag => (
                                    <button key={ag.id}
                                      onClick={() => selecionarAtrib(ag)}
                                      className="px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all"
                                      style={{
                                        borderColor: especEscolhido?.id === ag.id ? '#005ED5' : '#E5E7EB',
                                        background: especEscolhido?.id === ag.id ? 'rgba(0,94,213,0.1)' : '#fff',
                                        color: especEscolhido?.id === ag.id ? '#005ED5' : '#374151',
                                      }}>
                                      {ag.nome}
                                    </button>
                                  ))}
                                {especificaçõesGlobais.filter(ag => !(especificaçõesPorModelo[p.id] ?? []).some(pa => pa.especificacaoId === ag.id)).length === 0 && (
                                  <p className="text-xs text-gray-400">Todos os especificacoes já estão associados a este modelo.</p>
                                )}
                              </div>

                              {/* Variacoes do especificacao escolhido */}
                              {especEscolhido && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                                    Opções habilitadas para este modelo:
                                  </p>
                                  {especEscolhido.variacoes.length === 0 ? (
                                    <p className="text-xs text-gray-400">Este especificacao não tem opções cadastradas.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {especEscolhido.variacoes.map(op => (
                                        <button key={op.id}
                                          onClick={() => toggleOpcaoSel(op.id)}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all"
                                          style={{
                                            borderColor: variacoesSel.has(op.id) ? '#005ED5' : '#E5E7EB',
                                            background: variacoesSel.has(op.id) ? 'rgba(0,94,213,0.1)' : '#fff',
                                            color: variacoesSel.has(op.id) ? '#005ED5' : '#9CA3AF',
                                          }}>
                                          {variacoesSel.has(op.id) && <Check size={9} />}
                                          {op.valor}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer mt-2">
                                    <input type="checkbox" checked={obrigNovo} onChange={e => setObrigNovo(e.target.checked)}
                                      className="w-3.5 h-3.5 accent-blue-600" />
                                    Obrigatório para o cliente
                                  </label>
                                </div>
                              )}

                              {erroAssoc && <p className="text-xs text-red-500">{erroAssoc}</p>}

                              <div className="flex gap-2">
                                <button onClick={() => setAdicionandoAtrib(null)}
                                  className="flex-1 py-2 rounded-xl text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50">
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => confirmarAssociacao(p.id)}
                                  disabled={!especEscolhido || criandoAssoc}
                                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50 transition-all"
                                  style={{ background: '#005ED5' }}>
                                  {criandoAssoc ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                                  Associar
                                </button>
                              </div>
                            </div>
                          ) : copiandoPara !== p.id && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                onClick={() => abrirAdicionarAtrib(p.id)}
                                className="py-2 rounded-xl text-xs font-semibold border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5">
                                <Plus size={13} /> Adicionar Especificação
                              </button>
                              <button
                                onClick={() => abrirCopiar(p.id)}
                                className="py-2 rounded-xl text-xs font-semibold border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5">
                                <Copy size={13} /> Copiar de outro modelo
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmar && (
        <ConfirmModal
          titulo={confirmar.titulo}
          mensagem={confirmar.mensagem}
          onConfirm={executarConfirmacao}
          onCancel={() => setConfirmar(null)}
          carregando={confirmCarregando}
        />
      )}

      {/* Modal criar/editar modelo */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {modal === 'criar' ? 'Novo Modelo' : 'Editar Modelo'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {erroModal && (
                <div className="px-3 py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-100">
                  {erroModal}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="Ex: Camiseta Polo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Linha *</label>
                <select value={form.linha_id} onChange={e => setForm({ ...form, linha_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white">
                  {linhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="Breve descrição..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Imagem</label>
                <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  style={{ borderColor: imagem ? '#005ED5' : '#E5E7EB' }}
                  onClick={() => document.getElementById('prod-img')?.click()}>
                  <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {imagem ? imagem.name : (editando?.imagem ? 'Trocar imagem' : 'Clique para enviar')}
                  </p>
                </div>
                <input id="prod-img" type="file" accept="image/*" className="hidden"
                  onChange={e => setImagem(e.target.files?.[0] ?? null)} />
              </div>
              <button onClick={salvar} disabled={salvando || !form.nome || !form.linha_id}
                className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: '#005ED5' }}>
                {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
                {salvando ? 'Salvando...' : 'Salvar Modelo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
