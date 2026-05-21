'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, X, Loader2, Check } from 'lucide-react';
import api from '@/lib/api';

interface Categoria { id: number; nome: string; slug: string; ativo: boolean }

function gerarSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nome: '', slug: '' });
  const [slugManual, setSlugManual] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/categorias?todos=true');
      setCategorias(res.data.categorias);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCriar = () => {
    setEditando(null);
    setForm({ nome: '', slug: '' });
    setSlugManual(false);
    setErro(null);
    setModal('criar');
  };

  const abrirEditar = (c: Categoria) => {
    setEditando(c);
    setForm({ nome: c.nome, slug: c.slug });
    setSlugManual(true);
    setErro(null);
    setModal('editar');
  };

  const handleNome = (nome: string) => {
    setForm(f => ({ nome, slug: slugManual ? f.slug : gerarSlug(nome) }));
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.slug.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      if (modal === 'criar') {
        await api.post('/categorias', { nome: form.nome.trim(), slug: form.slug.trim() });
      } else if (editando) {
        await api.put(`/categorias/${editando.id}`, { nome: form.nome.trim(), slug: form.slug.trim() });
      }
      setModal(null);
      await carregar();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErro(msg ?? 'Erro ao salvar. Tente novamente.');
    } finally { setSalvando(false); }
  };

  const toggleAtivo = async (c: Categoria) => {
    await api.put(`/categorias/${c.id}`, { ativo: !c.ativo });
    setCategorias(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x));
  };

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-500 text-sm mt-1">
            {categorias.length} categoria{categorias.length !== 1 ? 's' : ''} — só aparecem no site se tiverem produtos ativos
          </p>
        </div>
        <button onClick={abrirCriar}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
          style={{ background: '#005ED5' }}>
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
        </div>
      ) : categorias.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-semibold mb-2">Nenhuma categoria ainda</p>
          <p className="text-sm">Clique em "Nova Categoria" para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categorias.map(c => (
            <div key={c.id}
              className={`bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4 transition-all ${
                c.ativo ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{c.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{c.slug}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleAtivo(c)}
                  className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: c.ativo ? 'rgba(16,185,129,0.1)' : 'rgba(156,163,175,0.15)',
                    color: c.ativo ? '#10B981' : '#6B7280',
                  }}>
                  {c.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {c.ativo ? 'Ativa' : 'Inativa'}
                </button>
                <button onClick={() => abrirEditar(c)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors">
                  <Edit2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">
                {modal === 'criar' ? 'Nova Categoria' : 'Editar Categoria'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {erro && (
                <div className="px-3 py-2.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-100">
                  {erro}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                <input value={form.nome} onChange={e => handleNome(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="Ex: Camisetas" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Slug <span className="text-gray-400 font-normal">(identificador único)</span>
                </label>
                <div className="relative">
                  <input value={form.slug}
                    onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })); }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 font-mono"
                    placeholder="Ex: camisetas" />
                  {!slugManual && form.slug && (
                    <span className="absolute right-3 top-2.5">
                      <Check size={14} className="text-green-500" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Gerado automaticamente. Só letras, números e hífens.</p>
              </div>

              <button onClick={salvar} disabled={salvando || !form.nome.trim() || !form.slug.trim()}
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
