'use client';

/**
 * Página /admin/produtos
 * --------------------------------------------------------------------------
 * CRUD de produtos + gestão de quais atributos (e quais opções de cada
 * atributo) cada produto expõe ao cliente no formulário de orçamento.
 *
 * Categorias são apenas LISTADAS aqui (necessárias para criar/editar
 * produto). O CRUD completo de categorias vive em /admin/categorias —
 * para evitar duas fontes de verdade na UI.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X,
  Upload, Loader2, ChevronDown, Check, Link2, Link2Off, Tag, ExternalLink,
} from 'lucide-react';
import api, { API_BASE } from '@/lib/api';
import ConfirmModal from '@/components/admin/ConfirmModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Categoria { id: number; nome: string; slug: string; ativo: boolean }
interface OpcaoGlobal { id: number; valor: string }
interface AtributoGlobal { id: number; nome: string; opcoes: OpcaoGlobal[] }

interface OpcaoProduto { id: number; valor: string }
interface AtributoProduto {
  id: number;          // ProdutoAtributo.id
  atributoId: number;  // Atributo global.id
  nome: string;
  obrigatorio: boolean;
  opcoes: OpcaoProduto[]; // opcoes habilitadas para este produto
}

interface Produto {
  id: number; nome: string; descricao?: string; imagem?: string;
  ativo: boolean; categoriaId: number; categoria: Categoria;
}

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado.';

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [atributosGlobais, setAtributosGlobais] = useState<AtributoGlobal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de confirmação genérico (compartilhado entre exclusão de produto e
  // remoção de associação de atributo).
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

  // Modal produto
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', categoria_id: '' });
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Expansão / atributos
  const [expandido, setExpandido] = useState<number | null>(null);
  const [atributosPorProduto, setAtributosPorProduto] = useState<Record<number, AtributoProduto[]>>({});

  // Painel "adicionar atributo"
  const [adicionandoAtrib, setAdicionandoAtrib] = useState<number | null>(null); // produtoId
  const [atribEscolhido, setAtribEscolhido] = useState<AtributoGlobal | null>(null);
  const [opcoesSel, setOpcoesSel] = useState<Set<number>>(new Set());
  const [obrigNovo, setObrigNovo] = useState(false);
  const [criandoAssoc, setCriandoAssoc] = useState(false);
  const [erroAssoc, setErroAssoc] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, aRes] = await Promise.all([
        api.get('/produtos?apenasAtivos=false'),
        api.get('/categorias?todos=true'),
        api.get('/atributos'),
      ]);
      setProdutos(pRes.data.produtos);
      setCategorias(cRes.data.categorias);
      setAtributosGlobais(aRes.data.atributos);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Carrega atributos ao expandir produto
  const expandirProduto = async (id: number) => {
    if (expandido === id) { setExpandido(null); return; }
    setExpandido(id);
    setAdicionandoAtrib(null);
    if (!atributosPorProduto[id]) {
      const res = await api.get(`/produtos/${id}/atributos`);
      setAtributosPorProduto(prev => ({ ...prev, [id]: res.data.atributos }));
    }
  };

  const setAtributos = (produtoId: number, fn: (a: AtributoProduto[]) => AtributoProduto[]) =>
    setAtributosPorProduto(prev => ({ ...prev, [produtoId]: fn(prev[produtoId] ?? []) }));

  // ── CRUD produto ─────────────────────────────────────────────────────────────
  const abrirCriar = () => {
    setEditando(null);
    setForm({ nome: '', descricao: '', categoria_id: categorias[0]?.id.toString() || '' });
    setImagem(null); setErroModal(null); setModal('criar');
  };

  const abrirEditar = (p: Produto) => {
    setEditando(p);
    setForm({ nome: p.nome, descricao: p.descricao || '', categoria_id: String(p.categoriaId) });
    setImagem(null); setErroModal(null); setModal('editar');
  };

  const salvar = async () => {
    setSalvando(true); setErroModal(null);
    try {
      const fd = new FormData();
      fd.append('nome', form.nome);
      fd.append('descricao', form.descricao);
      fd.append('categoria_id', form.categoria_id);
      if (imagem) fd.append('imagem', imagem);
      if (modal === 'criar') {
        await api.post('/produtos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else if (editando) {
        await api.put(`/produtos/${editando.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setModal(null); await carregar();
    } catch (e) {
      setErroModal(errMsg(e));
    } finally { setSalvando(false); }
  };

  const toggleAtivo = async (p: Produto) => {
    await api.patch(`/produtos/${p.id}/toggle`);
    setProdutos(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
  };

  const excluirProduto = async (p: Produto) => {
    pedirConfirmacao(
      'Excluir Produto',
      `Tem certeza que quer excluir "${p.nome}"? Esta ação não pode ser desfeita.`,
      async () => {
        await api.delete(`/produtos/${p.id}`);
        setProdutos(prev => prev.filter(x => x.id !== p.id));
        if (expandido === p.id) setExpandido(null);
      }
    );
  };

  // ── Gerenciar associações de atributos ────────────────────────────────────────
  const abrirAdicionarAtrib = (produtoId: number) => {
    setAdicionandoAtrib(produtoId);
    setAtribEscolhido(null);
    setOpcoesSel(new Set());
    setObrigNovo(false);
    setErroAssoc(null);
  };

  const selecionarAtrib = (atrib: AtributoGlobal) => {
    setAtribEscolhido(atrib);
    setOpcoesSel(new Set(atrib.opcoes.map(o => o.id)));
  };

  const toggleOpcaoSel = (id: number) => {
    setOpcoesSel(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const confirmarAssociacao = async (produtoId: number) => {
    if (!atribEscolhido) return;
    setCriandoAssoc(true); setErroAssoc(null);
    try {
      const res = await api.post(`/produtos/${produtoId}/atributos`, {
        atributo_id: atribEscolhido.id,
        obrigatorio: obrigNovo,
        opcao_ids: Array.from(opcoesSel),
      });
      setAtributos(produtoId, a => [...a, res.data.atributo]);
      setAdicionandoAtrib(null);
    } catch (e) {
      setErroAssoc(errMsg(e));
    } finally { setCriandoAssoc(false); }
  };

  const removerAssociacao = (paId: number, produtoId: number) => {
    pedirConfirmacao(
      'Remover Atributo',
      'Tem certeza que quer remover este atributo do produto?',
      async () => {
        await api.delete(`/produtos/${produtoId}/atributos/${paId}`);
        setAtributos(produtoId, a => a.filter(x => x.id !== paId));
      }
    );
  };

  const toggleOpcaoProduto = async (pa: AtributoProduto, opcaoId: number, produtoId: number) => {
    const jaAtivo = pa.opcoes.some(o => o.id === opcaoId);
    const novasOpcoes = jaAtivo
      ? pa.opcoes.filter(o => o.id !== opcaoId).map(o => o.id)
      : [...pa.opcoes.map(o => o.id), opcaoId];

    const res = await api.put(`/produtos/${produtoId}/atributos/${pa.id}`, {
      opcao_ids: novasOpcoes,
    });
    setAtributos(produtoId, a => a.map(x => x.id === pa.id ? res.data.atributo : x));
  };

  const toggleObrigatorio = async (pa: AtributoProduto, produtoId: number) => {
    const res = await api.put(`/produtos/${produtoId}/atributos/${pa.id}`, {
      obrigatorio: !pa.obrigatorio,
    });
    setAtributos(produtoId, a => a.map(x => x.id === pa.id ? res.data.atributo : x));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirCriar}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
          style={{ background: '#005ED5' }}>
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      {/*
        Painel resumo de categorias.
        Apenas listagem — para criar/editar/desativar, segue link para
        /admin/categorias (fonte da verdade única).
      */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <Tag size={16} style={{ color: '#005ED5' }} />
          <h2 className="font-semibold text-gray-900 text-sm">Categorias</h2>
          <span className="text-xs text-gray-400">
            {categorias.length} cadastrada{categorias.length !== 1 ? 's' : ''}
          </span>
          <Link
            href="/admin/categorias"
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
          >
            Gerenciar categorias <ExternalLink size={12} />
          </Link>
        </div>
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nenhuma categoria cadastrada. <Link href="/admin/categorias" className="text-blue-600 hover:underline">Cadastre a primeira</Link> para criar produtos.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categorias.map(c => (
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
      ) : produtos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-semibold mb-2">Nenhum produto cadastrado</p>
          <p className="text-sm">Clique em "Novo Produto" para começar</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categorias
            .filter(c => produtos.some(p => p.categoriaId === c.id))
            .map(cat => (
              <div key={cat.id}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-gray-700">{cat.nome}</h2>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">
                    {produtos.filter(p => p.categoriaId === cat.id).length} produto{produtos.filter(p => p.categoriaId === cat.id).length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {produtos.filter(p => p.categoriaId === cat.id).map(p => (
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
                        <button onClick={() => excluirProduto(p)}
                          className="flex-shrink-0 p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Excluir produto">
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
                          title="Editar produto">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => expandirProduto(p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: expandido === p.id ? 'rgba(0,94,213,0.08)' : '#F3F4F6',
                            color: expandido === p.id ? '#005ED5' : '#6B7280',
                          }}>
                          <ChevronDown size={15} className={`transition-transform duration-200 ${expandido === p.id ? 'rotate-180' : ''}`} />
                          Atributos
                        </button>
                      </div>

                      {/* Painel de atributos */}
                      {expandido === p.id && (
                        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-3">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Atributos do Produto</p>

                          {/* Atributos associados */}
                          {(atributosPorProduto[p.id] ?? []).length === 0 && adicionandoAtrib !== p.id && (
                            <p className="text-sm text-gray-400">Nenhum atributo associado.</p>
                          )}

                          {(atributosPorProduto[p.id] ?? []).map(pa => {
                            const global = atributosGlobais.find(a => a.id === pa.atributoId);
                            const todasOpcoes = global?.opcoes ?? [];
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
                                    title="Remover atributo do produto">
                                    <Link2Off size={13} />
                                  </button>
                                </div>

                                {todasOpcoes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {todasOpcoes.map(opcao => {
                                      const ativa = pa.opcoes.some(o => o.id === opcao.id);
                                      return (
                                        <button key={opcao.id}
                                          onClick={() => toggleOpcaoProduto(pa, opcao.id, p.id)}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
                                          style={{
                                            background: ativa ? 'rgba(0,94,213,0.1)' : 'transparent',
                                            color: ativa ? '#005ED5' : '#9CA3AF',
                                            borderColor: ativa ? 'rgba(0,94,213,0.3)' : '#E5E7EB',
                                          }}>
                                          {ativa && <Check size={9} />}
                                          {opcao.valor}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">Sem opções cadastradas neste atributo.</p>
                                )}
                              </div>
                            );
                          })}

                          {/* Painel adicionar atributo */}
                          {adicionandoAtrib === p.id ? (
                            <div className="bg-white rounded-xl border border-dashed border-blue-300 p-3 space-y-3">
                              <p className="text-xs font-semibold text-gray-600">Selecionar atributo</p>

                              {/* Picker de atributo */}
                              <div className="flex flex-wrap gap-2">
                                {atributosGlobais
                                  .filter(ag => !(atributosPorProduto[p.id] ?? []).some(pa => pa.atributoId === ag.id))
                                  .map(ag => (
                                    <button key={ag.id}
                                      onClick={() => selecionarAtrib(ag)}
                                      className="px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all"
                                      style={{
                                        borderColor: atribEscolhido?.id === ag.id ? '#005ED5' : '#E5E7EB',
                                        background: atribEscolhido?.id === ag.id ? 'rgba(0,94,213,0.1)' : '#fff',
                                        color: atribEscolhido?.id === ag.id ? '#005ED5' : '#374151',
                                      }}>
                                      {ag.nome}
                                    </button>
                                  ))}
                                {atributosGlobais.filter(ag => !(atributosPorProduto[p.id] ?? []).some(pa => pa.atributoId === ag.id)).length === 0 && (
                                  <p className="text-xs text-gray-400">Todos os atributos já estão associados a este produto.</p>
                                )}
                              </div>

                              {/* Opcoes do atributo escolhido */}
                              {atribEscolhido && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-1.5">
                                    Opções habilitadas para este produto:
                                  </p>
                                  {atribEscolhido.opcoes.length === 0 ? (
                                    <p className="text-xs text-gray-400">Este atributo não tem opções cadastradas.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {atribEscolhido.opcoes.map(op => (
                                        <button key={op.id}
                                          onClick={() => toggleOpcaoSel(op.id)}
                                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all"
                                          style={{
                                            borderColor: opcoesSel.has(op.id) ? '#005ED5' : '#E5E7EB',
                                            background: opcoesSel.has(op.id) ? 'rgba(0,94,213,0.1)' : '#fff',
                                            color: opcoesSel.has(op.id) ? '#005ED5' : '#9CA3AF',
                                          }}>
                                          {opcoesSel.has(op.id) && <Check size={9} />}
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
                                  disabled={!atribEscolhido || criandoAssoc}
                                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50 transition-all"
                                  style={{ background: '#005ED5' }}>
                                  {criandoAssoc ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                                  Associar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => abrirAdicionarAtrib(p.id)}
                              className="w-full py-2 rounded-xl text-xs font-semibold border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5">
                              <Plus size={13} /> Adicionar Atributo
                            </button>
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

      {/* Modal criar/editar produto */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {modal === 'criar' ? 'Novo Produto' : 'Editar Produto'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria *</label>
                <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white">
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
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
              <button onClick={salvar} disabled={salvando || !form.nome || !form.categoria_id}
                className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: '#005ED5' }}>
                {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
                {salvando ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
