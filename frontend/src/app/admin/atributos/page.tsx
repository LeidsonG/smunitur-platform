'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, ChevronDown, Tag } from 'lucide-react';
import api from '@/lib/api';

interface Opcao { id: number; valor: string; ordem: number; ativo: boolean }
interface Atributo { id: number; nome: string; obrigatorio: boolean; ordem: number; ativo: boolean; opcoes: Opcao[] }
interface Categoria { id: number; nome: string; slug: string }

export default function AtributosPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [catSelecionada, setCatSelecionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado de criação de novo atributo
  const [novoAtributo, setNovoAtributo] = useState('');
  const [novoObrigatorio, setNovoObrigatorio] = useState(false);
  const [criandoAtributo, setCriandoAtributo] = useState(false);

  // Estado de edição de atributo
  const [editandoAtributo, setEditandoAtributo] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');

  // Estado de nova opção
  const [novaOpcao, setNovaOpcao] = useState<Record<number, string>>({});
  const [criandoOpcao, setCriandoOpcao] = useState<number | null>(null);

  // Estado de edição de opção
  const [editandoOpcao, setEditandoOpcao] = useState<number | null>(null);
  const [editOpcaoValor, setEditOpcaoValor] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/categorias'),
      api.get('/atributos'),
    ]).then(([catRes, attrRes]) => {
      setCategorias(catRes.data.categorias);
      setAtributos(attrRes.data.atributos);
      if (catRes.data.categorias.length > 0) setCatSelecionada(catRes.data.categorias[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const atributosDaCategoria = atributos.filter(a => {
    const cat = categorias.find(c => c.id === catSelecionada);
    if (!cat) return false;
    // O backend retorna atributo.categoria.id
    return (a as unknown as { categoria?: { id: number } }).categoria?.id === catSelecionada;
  });

  async function criarAtributo() {
    if (!novoAtributo.trim() || !catSelecionada) return;
    setCriandoAtributo(true);
    try {
      const res = await api.post('/atributos', {
        categoria_id: catSelecionada,
        nome: novoAtributo.trim(),
        obrigatorio: novoObrigatorio,
        ordem: atributosDaCategoria.length,
      });
      setAtributos(prev => [...prev, { ...res.data.atributo, categoria: { id: catSelecionada } }]);
      setNovoAtributo('');
      setNovoObrigatorio(false);
    } finally { setCriandoAtributo(false); }
  }

  async function salvarEdicaoAtributo(id: number) {
    if (!editNome.trim()) return;
    await api.patch(`/atributos/${id}`, { nome: editNome.trim() });
    setAtributos(prev => prev.map(a => a.id === id ? { ...a, nome: editNome.trim() } : a));
    setEditandoAtributo(null);
  }

  async function excluirAtributo(id: number) {
    if (!confirm('Excluir atributo e todas as suas opções?')) return;
    await api.delete(`/atributos/${id}`);
    setAtributos(prev => prev.filter(a => a.id !== id));
  }

  async function criarOpcao(atributoId: number) {
    const valor = novaOpcao[atributoId]?.trim();
    if (!valor) return;
    setCriandoOpcao(atributoId);
    try {
      const res = await api.post(`/atributos/${atributoId}/opcoes`, { valor });
      setAtributos(prev => prev.map(a =>
        a.id === atributoId ? { ...a, opcoes: [...a.opcoes, res.data.opcao] } : a
      ));
      setNovaOpcao(prev => ({ ...prev, [atributoId]: '' }));
    } finally { setCriandoOpcao(null); }
  }

  async function salvarEdicaoOpcao(opcaoId: number, atributoId: number) {
    if (!editOpcaoValor.trim()) return;
    await api.patch(`/atributos/opcoes/${opcaoId}`, { valor: editOpcaoValor.trim() });
    setAtributos(prev => prev.map(a =>
      a.id === atributoId
        ? { ...a, opcoes: a.opcoes.map(o => o.id === opcaoId ? { ...o, valor: editOpcaoValor.trim() } : o) }
        : a
    ));
    setEditandoOpcao(null);
  }

  async function excluirOpcao(opcaoId: number, atributoId: number) {
    if (!confirm('Excluir esta opção?')) return;
    await api.delete(`/atributos/opcoes/${opcaoId}`);
    setAtributos(prev => prev.map(a =>
      a.id === atributoId ? { ...a, opcoes: a.opcoes.filter(o => o.id !== opcaoId) } : a
    ));
  }

  if (loading) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Atributos de Produtos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure os atributos e opções que aparecem no formulário de orçamento para cada categoria.
        </p>
      </div>

      {/* Abas de categoria */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categorias.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCatSelecionada(cat.id)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200"
            style={{
              background: catSelecionada === cat.id ? '#005ED5' : '#F1F5F9',
              color: catSelecionada === cat.id ? '#fff' : '#64748B',
            }}
          >
            {cat.nome}
          </button>
        ))}
      </div>

      {catSelecionada && (
        <div className="space-y-4">
          {/* Lista de atributos */}
          {atributosDaCategoria.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
              Nenhum atributo cadastrado para esta categoria.
            </div>
          )}

          {atributosDaCategoria.map(atributo => (
            <div key={atributo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header do atributo */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                <Tag size={16} className="text-blue-500 flex-shrink-0" />

                {editandoAtributo === atributo.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={editNome}
                      onChange={e => setEditNome(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && salvarEdicaoAtributo(atributo.id)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      autoFocus
                    />
                    <button onClick={() => salvarEdicaoAtributo(atributo.id)}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditandoAtributo(null)}
                      className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-semibold text-gray-900">{atributo.nome}</span>
                    {atributo.obrigatorio && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600">
                        Obrigatório
                      </span>
                    )}
                  </div>
                )}

                {editandoAtributo !== atributo.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditandoAtributo(atributo.id); setEditNome(atributo.nome); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => excluirAtributo(atributo.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Opções */}
              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {atributo.opcoes.map(opcao => (
                    <div key={opcao.id} className="flex items-center gap-1">
                      {editandoOpcao === opcao.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            value={editOpcaoValor}
                            onChange={e => setEditOpcaoValor(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && salvarEdicaoOpcao(opcao.id, atributo.id)}
                            className="w-28 px-2 py-1 rounded-lg border border-blue-300 text-xs outline-none focus:ring-2 focus:ring-blue-100"
                            autoFocus
                          />
                          <button onClick={() => salvarEdicaoOpcao(opcao.id, atributo.id)}
                            className="p-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100">
                            <Check size={12} />
                          </button>
                          <button onClick={() => setEditandoOpcao(null)}
                            className="p-1 rounded-md bg-gray-100 text-gray-500">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-default"
                          style={{ background: 'rgba(0,94,213,0.08)', color: '#005ED5' }}
                        >
                          {opcao.valor}
                          <button
                            onClick={() => { setEditandoOpcao(opcao.id); setEditOpcaoValor(opcao.valor); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-800"
                          >
                            <Pencil size={10} />
                          </button>
                          <button
                            onClick={() => excluirOpcao(opcao.id, atributo.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Adicionar opção */}
                <div className="flex items-center gap-2">
                  <input
                    value={novaOpcao[atributo.id] ?? ''}
                    onChange={e => setNovaOpcao(prev => ({ ...prev, [atributo.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && criarOpcao(atributo.id)}
                    placeholder="Nova opção..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  />
                  <button
                    onClick={() => criarOpcao(atributo.id)}
                    disabled={criandoOpcao === atributo.id || !novaOpcao[atributo.id]?.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                    style={{ background: '#005ED5' }}
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Criar novo atributo */}
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Novo Atributo</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={novoAtributo}
                onChange={e => setNovoAtributo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && criarAtributo()}
                placeholder="Ex: Tipo de Gola, Tipo de Manga..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={novoObrigatorio}
                  onChange={e => setNovoObrigatorio(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                Obrigatório
              </label>
              <button
                onClick={criarAtributo}
                disabled={criandoAtributo || !novoAtributo.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
                style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}
              >
                <Plus size={16} />
                Criar Atributo
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
