'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, ToggleLeft, ToggleRight, X, Loader2, UserCircle } from 'lucide-react';
import api from '@/lib/api';

interface Usuario {
  id: number; nome: string; email: string;
  nivel: 'super_admin' | 'admin' | 'operador'; ativo: boolean; createdAt: string;
}

const NIVEL_LABEL = { super_admin: 'Super Admin', admin: 'Admin', operador: 'Operador' };
const NIVEL_COLOR = { super_admin: '#005ED5', admin: '#8B5CF6', operador: '#6B7280' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', nivel: 'operador' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/usuarios');
      setUsuarios(res.data.usuarios);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      await api.post('/admin/usuarios', form);
      setModal(false);
      setForm({ nome: '', email: '', senha: '', nivel: 'operador' });
      await carregar();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: Array<{ msg?: string }> } } };
      setErro(err.response?.data?.errors?.[0]?.msg || 'Erro ao criar usuário');
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (u: Usuario) => {
    await api.patch(`/admin/usuarios/${u.id}/toggle`);
    setUsuarios((prev) => prev.map((x) => x.id === u.id ? { ...x, ativo: !x.ativo } : x));
  };

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários Administrativos</h1>
          <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setModal(true); setErro(''); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105"
          style={{ background: '#005ED5' }}
        >
          <Plus size={18} /> Novo Usuário
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {usuarios.map((u) => (
              <div key={u.id} className={`flex items-center gap-4 px-6 py-4 ${!u.ativo ? 'opacity-50' : ''}`}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${NIVEL_COLOR[u.nivel]}18` }}
                >
                  <UserCircle size={22} style={{ color: NIVEL_COLOR[u.nivel] }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{u.nome}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>

                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                  style={{ background: `${NIVEL_COLOR[u.nivel]}18`, color: NIVEL_COLOR[u.nivel] }}
                >
                  {NIVEL_LABEL[u.nivel]}
                </span>

                <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                  {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                </span>

                <button
                  onClick={() => toggleAtivo(u)}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                  style={{
                    background: u.ativo ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: u.ativo ? '#10B981' : '#EF4444',
                  }}
                >
                  {u.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {u.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Novo Usuário</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {erro && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{erro}</div>
              )}

              {[
                { label: 'Nome', key: 'nome', type: 'text', placeholder: 'Nome completo' },
                { label: 'E-mail', key: 'email', type: 'email', placeholder: 'email@smunitur.com.br' },
                { label: 'Senha', key: 'senha', type: 'password', placeholder: 'Mínimo 6 caracteres' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nível</label>
                <select
                  value={form.nivel}
                  onChange={(e) => setForm({ ...form, nivel: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white"
                >
                  <option value="operador">Operador</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <button
                onClick={salvar}
                disabled={salvando || !form.nome || !form.email || !form.senha}
                className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: '#005ED5' }}
              >
                {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
                {salvando ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
