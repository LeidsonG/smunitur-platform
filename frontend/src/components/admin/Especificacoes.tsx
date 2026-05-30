'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Loader2, Tag, Camera } from 'lucide-react';
import api, { API_BASE } from '@/lib/api';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface Variacao { id: number; valor: string; ordem: number; imagem?: string | null }
interface Especificacao { id: number; nome: string; ordem: number; variacoes: Variacao[] }

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado.';

export default function Especificacoes() {
  const [especificacoes, setEspecificações] = useState<Especificacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal criar/editar especificação
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null);
  const [editando, setEditando] = useState<Especificacao | null>(null);
  const [nomeModal, setNomeModal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Variações inline
  const [novaOpcao, setNovaOpcao] = useState<Record<number, string>>({});
  const [erroOpcao, setErroOpcao] = useState<Record<number, string>>({});
  const [criandoOpcao, setCriandoOpcao] = useState<number | null>(null);
  const [editandoOpcao, setEditandoOpcao] = useState<{ id: number; especificacaoId: number } | null>(null);
  const [editOpcaoValor, setEditOpcaoValor] = useState('');

  const [enviandoImagem, setEnviandoImagem] = useState<number | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [imgTargetId, setImgTargetId] = useState<number | null>(null);

  // Modal de confirmação
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

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/especificacoes');
      setEspecificações(res.data.especificacoes);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── CRUD especificação ─────────────────────────────────────────────────────────
  const abrirCriar = () => {
    setEditando(null); setNomeModal(''); setErroModal(null); setModal('criar');
  };

  const abrirEditar = (a: Especificacao) => {
    setEditando(a); setNomeModal(a.nome); setErroModal(null); setModal('editar');
  };

  const salvar = async () => {
    if (!nomeModal.trim()) return;
    setSalvando(true); setErroModal(null);
    try {
      if (modal === 'criar') {
        const res = await api.post('/especificacoes', { nome: nomeModal.trim() });
        setEspecificações(prev => [...prev, { ...res.data.especificacao, variacoes: [] }]);
      } else if (editando) {
        await api.put(`/especificacoes/${editando.id}`, { nome: nomeModal.trim() });
        setEspecificações(prev => prev.map(a =>
          a.id === editando.id ? { ...a, nome: nomeModal.trim() } : a
        ));
      }
      setModal(null);
    } catch (e) {
      setErroModal(errMsg(e));
    } finally { setSalvando(false); }
  };

  const excluir = (id: number) => {
    pedirConfirmacao(
      'Excluir Especificação',
      'Isso vai excluir a especificação e todas as suas opções, removendo-a de todos os modelos associados.',
      async () => {
        await api.delete(`/especificacoes/${id}`);
        setEspecificações(prev => prev.filter(a => a.id !== id));
      }
    );
  };

  // ── CRUD variações ────────────────────────────────────────────────────────────
  const criarOpcao = async (especificacaoId: number) => {
    const valor = novaOpcao[especificacaoId]?.trim();
    if (!valor) return;
    setCriandoOpcao(especificacaoId);
    setErroOpcao(prev => { const n = { ...prev }; delete n[especificacaoId]; return n; });
    try {
      const res = await api.post(`/especificacoes/${especificacaoId}/variacoes`, { valor });
      setEspecificações(prev => prev.map(a =>
        a.id === especificacaoId ? { ...a, variacoes: [...a.variacoes, res.data.variacao] } : a
      ));
      setNovaOpcao(prev => ({ ...prev, [especificacaoId]: '' }));
    } catch (e) {
      setErroOpcao(prev => ({ ...prev, [especificacaoId]: errMsg(e) }));
    } finally { setCriandoOpcao(null); }
  };

  const salvarOpcao = async (variacaoId: number, especificacaoId: number) => {
    if (!editOpcaoValor.trim()) return;
    await api.patch(`/especificacoes/variacoes/${variacaoId}`, { valor: editOpcaoValor.trim() });
    setEspecificações(prev => prev.map(a =>
      a.id === especificacaoId
        ? { ...a, variacoes: a.variacoes.map(o => o.id === variacaoId ? { ...o, valor: editOpcaoValor.trim() } : o) }
        : a
    ));
    setEditandoOpcao(null);
  };

  const excluirOpcao = (variacaoId: number, especificacaoId: number) => {
    pedirConfirmacao(
      'Excluir Opção',
      'Esta opção será removida de todos os modelos que a utilizam.',
      async () => {
        await api.delete(`/especificacoes/variacoes/${variacaoId}`);
        setEspecificações(prev => prev.map(a =>
          a.id === especificacaoId ? { ...a, variacoes: a.variacoes.filter(o => o.id !== variacaoId) } : a
        ));
      }
    );
  };

  const abrirUploadImagem = (variacaoId: number) => {
    setImgTargetId(variacaoId);
    imgInputRef.current?.click();
  };

  const uploadImagem = async (file: File) => {
    if (!imgTargetId) return;
    setEnviandoImagem(imgTargetId);
    try {
      const fd = new FormData();
      fd.append('imagem', file);
      const res = await api.patch(`/especificacoes/variacoes/${imgTargetId}/imagem`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imgAtualizada = res.data.variacao.imagem;
      setEspecificações(prev => prev.map(a => ({
        ...a,
        variacoes: a.variacoes.map(o => o.id === imgTargetId ? { ...o, imagem: imgAtualizada } : o),
      })));
    } finally {
      setEnviandoImagem(null);
      setImgTargetId(null);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Especificações</h1>
          <p className="text-gray-500 text-sm mt-1">
            Biblioteca global — crie especificações aqui e reutilize em qualquer modelo
          </p>
        </div>
        <button
          onClick={abrirCriar}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
          style={{ background: '#005ED5' }}
        >
          <Plus size={18} /> Nova Especificação
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
        </div>
      ) : especificacoes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-semibold mb-2">Nenhuma especificação cadastrada</p>
          <p className="text-sm">Crie especificações como &quot;Gola&quot;, &quot;Tamanho&quot;, &quot;Cor&quot; e depois associe-as a modelos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {especificacoes.map(especificacao => (
            <div key={especificacao.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

              {/* Cabeçalho da especificação */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,94,213,0.1)' }}
                >
                  <Tag size={16} style={{ color: '#005ED5' }} />
                </div>
                <h2 className="font-bold text-gray-900 flex-1 text-base">{especificacao.nome}</h2>
                <span className="text-xs text-gray-400 mr-1">
                  {especificacao.variacoes.length} opç{especificacao.variacoes.length !== 1 ? 'ões' : 'ão'}
                </span>
                <button
                  onClick={() => abrirEditar(especificacao)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                  title="Editar nome"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => excluir(especificacao.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Excluir especificação"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Lista de variações — cada opção é uma linha horizontal */}
              {especificacao.variacoes.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {especificacao.variacoes.map(variacao => {
                    const estaEditando = editandoOpcao?.id === variacao.id && editandoOpcao.especificacaoId === especificacao.id;
                    const carregando = enviandoImagem === variacao.id;
                    return (
                      <div
                        key={variacao.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 transition-all"
                      >
                        {/* Miniatura da imagem — clicável para fazer upload */}
                        <button
                          onClick={() => abrirUploadImagem(variacao.id)}
                          disabled={carregando}
                          title="Clique para trocar imagem"
                          className="relative w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 group/img hover:border-blue-300 transition-colors"
                        >
                          {variacao.imagem
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={`${API_BASE}${variacao.imagem}`} alt={variacao.valor} className="w-full h-full object-contain p-0.5" />
                            : <div className="text-gray-300 text-[9px] text-center leading-tight select-none">sem<br />img</div>
                          }
                          <div
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg"
                            style={{ background: 'rgba(0,0,0,0.38)' }}
                          >
                            {carregando
                              ? <Loader2 size={13} className="text-white animate-spin" />
                              : <Camera size={13} className="text-white" />}
                          </div>
                        </button>

                        {/* Nome / edição inline */}
                        {estaEditando ? (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              value={editOpcaoValor}
                              onChange={e => setEditOpcaoValor(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') salvarOpcao(variacao.id, especificacao.id);
                                if (e.key === 'Escape') setEditandoOpcao(null);
                              }}
                              className="flex-1 text-sm border-b-2 border-blue-400 outline-none bg-transparent text-gray-900 py-0.5"
                              autoFocus
                            />
                            <button
                              onClick={() => salvarOpcao(variacao.id, especificacao.id)}
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors flex-shrink-0"
                              title="Confirmar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditandoOpcao(null)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">
                              {variacao.valor}
                            </span>

                            {/* Botões sempre visíveis */}
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditandoOpcao({ id: variacao.id, especificacaoId: especificacao.id });
                                  setEditOpcaoValor(variacao.valor);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-blue-600 transition-colors"
                                title="Editar opção"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => excluirOpcao(variacao.id, especificacao.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-red-500 transition-colors"
                                title="Excluir opção"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Adicionar nova opção */}
              <div className="flex gap-2">
                <input
                  value={novaOpcao[especificacao.id] ?? ''}
                  onChange={e => {
                    setNovaOpcao(p => ({ ...p, [especificacao.id]: e.target.value }));
                    setErroOpcao(p => { const n = { ...p }; delete n[especificacao.id]; return n; });
                  }}
                  onKeyDown={e => e.key === 'Enter' && criarOpcao(especificacao.id)}
                  placeholder="Nova opção..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => criarOpcao(especificacao.id)}
                  disabled={criandoOpcao === especificacao.id || !novaOpcao[especificacao.id]?.trim()}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center"
                  style={{ background: '#005ED5' }}
                >
                  {criandoOpcao === especificacao.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Plus size={14} />}
                </button>
              </div>
              {erroOpcao[especificacao.id] && (
                <p className="text-xs text-red-500 mt-1">{erroOpcao[especificacao.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input oculto para upload de imagem de opção */}
      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) uploadImagem(f);
        }}
      />

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

      {/* Modal criar/editar especificação */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {modal === 'criar' ? 'Nova Especificação' : 'Editar Especificação'}
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
                <input
                  value={nomeModal}
                  onChange={e => setNomeModal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && salvar()}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="Ex: Tipo de Gola"
                  autoFocus
                />
              </div>
              <button
                onClick={salvar}
                disabled={salvando || !nomeModal.trim()}
                className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: '#005ED5' }}
              >
                {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
