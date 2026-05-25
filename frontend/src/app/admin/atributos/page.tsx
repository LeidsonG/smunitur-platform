'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Loader2, Tag, Camera } from 'lucide-react';
import api, { API_BASE } from '@/lib/api';
import ConfirmModal from '@/components/admin/ConfirmModal';

interface Opcao { id: number; valor: string; ordem: number; imagem?: string | null }
interface Atributo { id: number; nome: string; ordem: number; opcoes: Opcao[] }

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erro inesperado.';

export default function AtributosPage() {
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal criar/editar atributo
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null);
  const [editando, setEditando] = useState<Atributo | null>(null);
  const [nomeModal, setNomeModal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  // Opcoes inline
  const [novaOpcao, setNovaOpcao] = useState<Record<number, string>>({});
  const [erroOpcao, setErroOpcao] = useState<Record<number, string>>({});
  const [criandoOpcao, setCriandoOpcao] = useState<number | null>(null);
  const [editandoOpcao, setEditandoOpcao] = useState<{ id: number; atributoId: number } | null>(null);
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
      const res = await api.get('/atributos');
      setAtributos(res.data.atributos);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── CRUD atributo ─────────────────────────────────────────────────────────────
  const abrirCriar = () => {
    setEditando(null); setNomeModal(''); setErroModal(null); setModal('criar');
  };

  const abrirEditar = (a: Atributo) => {
    setEditando(a); setNomeModal(a.nome); setErroModal(null); setModal('editar');
  };

  const salvar = async () => {
    if (!nomeModal.trim()) return;
    setSalvando(true); setErroModal(null);
    try {
      if (modal === 'criar') {
        const res = await api.post('/atributos', { nome: nomeModal.trim() });
        setAtributos(prev => [...prev, { ...res.data.atributo, opcoes: [] }]);
      } else if (editando) {
        await api.put(`/atributos/${editando.id}`, { nome: nomeModal.trim() });
        setAtributos(prev => prev.map(a =>
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
      'Excluir Atributo',
      'Isso vai excluir o atributo e todas as suas opções, removendo-o de todos os produtos associados.',
      async () => {
        await api.delete(`/atributos/${id}`);
        setAtributos(prev => prev.filter(a => a.id !== id));
      }
    );
  };

  // ── CRUD opcoes ───────────────────────────────────────────────────────────────
  const criarOpcao = async (atributoId: number) => {
    const valor = novaOpcao[atributoId]?.trim();
    if (!valor) return;
    setCriandoOpcao(atributoId);
    setErroOpcao(prev => { const n = { ...prev }; delete n[atributoId]; return n; });
    try {
      const res = await api.post(`/atributos/${atributoId}/opcoes`, { valor });
      setAtributos(prev => prev.map(a =>
        a.id === atributoId ? { ...a, opcoes: [...a.opcoes, res.data.opcao] } : a
      ));
      setNovaOpcao(prev => ({ ...prev, [atributoId]: '' }));
    } catch (e) {
      setErroOpcao(prev => ({ ...prev, [atributoId]: errMsg(e) }));
    } finally { setCriandoOpcao(null); }
  };

  const salvarOpcao = async (opcaoId: number, atributoId: number) => {
    if (!editOpcaoValor.trim()) return;
    await api.patch(`/atributos/opcoes/${opcaoId}`, { valor: editOpcaoValor.trim() });
    setAtributos(prev => prev.map(a =>
      a.id === atributoId
        ? { ...a, opcoes: a.opcoes.map(o => o.id === opcaoId ? { ...o, valor: editOpcaoValor.trim() } : o) }
        : a
    ));
    setEditandoOpcao(null);
  };

  const excluirOpcao = (opcaoId: number, atributoId: number) => {
    pedirConfirmacao(
      'Excluir Opção',
      'Esta opção será removida de todos os produtos que a utilizam.',
      async () => {
        await api.delete(`/atributos/opcoes/${opcaoId}`);
        setAtributos(prev => prev.map(a =>
          a.id === atributoId ? { ...a, opcoes: a.opcoes.filter(o => o.id !== opcaoId) } : a
        ));
      }
    );
  };

  const abrirUploadImagem = (opcaoId: number) => {
    setImgTargetId(opcaoId);
    imgInputRef.current?.click();
  };

  const uploadImagem = async (file: File) => {
    if (!imgTargetId) return;
    setEnviandoImagem(imgTargetId);
    try {
      const fd = new FormData();
      fd.append('imagem', file);
      const res = await api.patch(`/atributos/opcoes/${imgTargetId}/imagem`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const imgAtualizada = res.data.opcao.imagem;
      setAtributos(prev => prev.map(a => ({
        ...a,
        opcoes: a.opcoes.map(o => o.id === imgTargetId ? { ...o, imagem: imgAtualizada } : o),
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
          <h1 className="text-2xl font-bold text-gray-900">Atributos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Biblioteca global — crie atributos aqui e reutilize em qualquer produto
          </p>
        </div>
        <button
          onClick={abrirCriar}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
          style={{ background: '#005ED5' }}
        >
          <Plus size={18} /> Novo Atributo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
        </div>
      ) : atributos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-semibold mb-2">Nenhum atributo cadastrado</p>
          <p className="text-sm">Crie atributos como "Gola", "Tamanho", "Cor" e depois associe-os a produtos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {atributos.map(atributo => (
            <div key={atributo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0,94,213,0.1)' }}>
                  <Tag size={16} style={{ color: '#005ED5' }} />
                </div>
                <h2 className="font-bold text-gray-900 flex-1 text-base">{atributo.nome}</h2>
                <span className="text-xs text-gray-400 mr-1">
                  {atributo.opcoes.length} opç{atributo.opcoes.length !== 1 ? 'ões' : 'ão'}
                </span>
                <button onClick={() => abrirEditar(atributo)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => excluir(atributo.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Opções existentes — cards com imagem */}
              {atributo.opcoes.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {atributo.opcoes.map(opcao => {
                    const editando = editandoOpcao?.id === opcao.id && editandoOpcao.atributoId === atributo.id;
                    const carregando = enviandoImagem === opcao.id;
                    return (
                      <div key={opcao.id}
                        className="group relative flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white"
                        style={{ width: 80 }}>

                        {/* Área da imagem */}
                        <div className="relative h-16 bg-white flex items-center justify-center">
                          {opcao.imagem
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={`${API_BASE}${opcao.imagem}`} alt={opcao.valor}
                                className="w-full h-full object-contain p-1" />
                            : <div className="text-gray-200 text-xs text-center leading-tight px-1">sem<br/>imagem</div>
                          }
                          {/* Botão câmera sobre a imagem */}
                          <button
                            onClick={() => abrirUploadImagem(opcao.id)}
                            disabled={carregando}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                            style={{ background: 'rgba(0,0,0,0.35)' }}
                            title="Adicionar/trocar imagem"
                          >
                            {carregando
                              ? <Loader2 size={16} className="text-white animate-spin" />
                              : <Camera size={16} className="text-white" />}
                          </button>
                        </div>

                        {/* Label / edição */}
                        <div className="px-1 py-1.5 border-t border-gray-100 bg-gray-50 min-h-[32px] flex items-center justify-center">
                          {editando ? (
                            <div className="flex items-center gap-0.5 w-full">
                              <input
                                value={editOpcaoValor}
                                onChange={e => setEditOpcaoValor(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && salvarOpcao(opcao.id, atributo.id)}
                                className="w-full text-xs border-b border-blue-400 outline-none bg-transparent text-center"
                                autoFocus
                              />
                              <button onClick={() => salvarOpcao(opcao.id, atributo.id)} className="text-green-500 flex-shrink-0">
                                <Check size={11} />
                              </button>
                              <button onClick={() => setEditandoOpcao(null)} className="text-gray-400 flex-shrink-0">
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full px-0.5 gap-0.5">
                              <span className="text-xs font-semibold text-gray-700 truncate flex-1 text-center">{opcao.valor}</span>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  onClick={() => { setEditandoOpcao({ id: opcao.id, atributoId: atributo.id }); setEditOpcaoValor(opcao.valor); }}
                                  className="p-0.5 rounded hover:text-blue-500 text-gray-400">
                                  <Pencil size={10} />
                                </button>
                                <button
                                  onClick={() => excluirOpcao(opcao.id, atributo.id)}
                                  className="p-0.5 rounded hover:text-red-500 text-gray-400">
                                  <X size={10} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Nova opção */}
              <div className="flex gap-2">
                <input
                  value={novaOpcao[atributo.id] ?? ''}
                  onChange={e => {
                    setNovaOpcao(p => ({ ...p, [atributo.id]: e.target.value }));
                    setErroOpcao(p => { const n = { ...p }; delete n[atributo.id]; return n; });
                  }}
                  onKeyDown={e => e.key === 'Enter' && criarOpcao(atributo.id)}
                  placeholder="Nova opção..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => criarOpcao(atributo.id)}
                  disabled={criandoOpcao === atributo.id || !novaOpcao[atributo.id]?.trim()}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all flex items-center"
                  style={{ background: '#005ED5' }}>
                  {criandoOpcao === atributo.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Plus size={14} />}
                </button>
              </div>
              {erroOpcao[atributo.id] && (
                <p className="text-xs text-red-500 mt-1">{erroOpcao[atributo.id]}</p>
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

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {modal === 'criar' ? 'Novo Atributo' : 'Editar Atributo'}
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
                style={{ background: '#005ED5' }}>
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
