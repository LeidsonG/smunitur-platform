'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, X, Upload, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Categoria { id: number; nome: string; slug: string; }
interface Produto {
  id: number; nome: string; descricao?: string; imagem?: string;
  ativo: boolean; categoriaId: number; categoria: Categoria;
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'criar' | 'editar' | null>(null);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '', categoria_id: '' });
  const [imagem, setImagem] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/produtos?apenasAtivos=false'),
        api.get('/categorias'),
      ]);
      setProdutos(pRes.data.produtos);
      setCategorias(cRes.data.categorias);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCriar = () => {
    setEditando(null);
    setForm({ nome: '', descricao: '', categoria_id: categorias[0]?.id.toString() || '' });
    setImagem(null);
    setModal('criar');
  };

  const abrirEditar = (p: Produto) => {
    setEditando(p);
    setForm({ nome: p.nome, descricao: p.descricao || '', categoria_id: String(p.categoriaId) });
    setImagem(null);
    setModal('editar');
  };

  const salvar = async () => {
    setSalvando(true);
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

      setModal(null);
      await carregar();
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (p: Produto) => {
    await api.patch(`/produtos/${p.id}/toggle`);
    setProdutos((prev) => prev.map((x) => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
  };

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 text-sm mt-1">{produtos.length} produto{produtos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={abrirCriar}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
          style={{ background: '#005ED5' }}
        >
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {produtos.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                p.ativo ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              {/* Imagem */}
              <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden">
                {p.imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`http://localhost:3001${p.imagem}`} alt={p.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-300 text-4xl">🎽</div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{p.nome}</h3>
                </div>
                <p className="text-xs text-gray-400 mb-1">{p.categoria.nome}</p>
                {p.descricao && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{p.descricao}</p>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => abrirEditar(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <button
                    onClick={() => toggleAtivo(p)}
                    className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: p.ativo ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: p.ativo ? '#10B981' : '#EF4444',
                    }}
                  >
                    {p.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  placeholder="Ex: Camiseta Polo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria *</label>
                <select
                  value={form.categoria_id}
                  onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white"
                >
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="Descrição do produto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Imagem</label>
                <div
                  className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  style={{ borderColor: imagem ? '#005ED5' : '#E5E7EB' }}
                  onClick={() => document.getElementById('prod-img')?.click()}
                >
                  <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {imagem ? imagem.name : (editando?.imagem ? 'Trocar imagem' : 'Clique para enviar')}
                  </p>
                </div>
                <input id="prod-img" type="file" accept="image/*" className="hidden"
                  onChange={(e) => setImagem(e.target.files?.[0] ?? null)} />
              </div>

              <button
                onClick={salvar}
                disabled={salvando || !form.nome || !form.categoria_id}
                className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: '#005ED5' }}
              >
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
