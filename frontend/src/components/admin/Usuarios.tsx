'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, ToggleLeft, ToggleRight, X, Loader2, UserCircle,
  Pencil, Key, Trash2, AlertCircle, ShieldAlert,
} from 'lucide-react';
import api from '@/lib/api';

interface Usuario {
  id: number; nome: string; email: string;
  nivel: 'super_admin' | 'admin' | 'operador'; ativo: boolean; createdAt: string;
}

const NIVEL_LABEL: Record<Usuario['nivel'], string> = {
  super_admin: 'Super Admin', admin: 'Admin', operador: 'Operador',
};
const NIVEL_COLOR: Record<Usuario['nivel'], string> = {
  super_admin: '#005ED5', admin: '#8B5CF6', operador: '#6B7280',
};

type Modal =
  | { type: 'criar' }
  | { type: 'editar'; usuario: Usuario }
  | { type: 'senha'; usuario: Usuario }
  | { type: 'excluir'; usuario: Usuario }
  | null;

function extrairErro(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string; errors?: Array<{ msg?: string }> } } };
  return err.response?.data?.error
    || err.response?.data?.errors?.[0]?.msg
    || fallback;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [meuId, setMeuId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('smunitur_admin');
      if (raw) setMeuId(JSON.parse(raw).id);
    } catch { /* ignore */ }
  }, []);

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

  const toggleAtivo = async (u: Usuario) => {
    if (u.id === meuId) {
      alert('Você não pode desativar a si mesmo.');
      return;
    }
    try {
      await api.patch(`/admin/usuarios/${u.id}/toggle`);
      setUsuarios((prev) => prev.map((x) => x.id === u.id ? { ...x, ativo: !x.ativo } : x));
    } catch (e) {
      alert(extrairErro(e, 'Erro ao alterar status'));
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários Administrativos</h1>
          <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal({ type: 'criar' })}
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
            {usuarios.map((u) => {
              const ehVoce = u.id === meuId;
              return (
                <div key={u.id} className={`flex flex-wrap items-center gap-3 px-6 py-4 ${!u.ativo ? 'opacity-50' : ''}`}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${NIVEL_COLOR[u.nivel]}18` }}
                  >
                    <UserCircle size={22} style={{ color: NIVEL_COLOR[u.nivel] }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{u.nome}</p>
                      {ehVoce && (
                        <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          Você
                        </span>
                      )}
                    </div>
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

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setModal({ type: 'editar', usuario: u })}
                      title="Editar dados"
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setModal({ type: 'senha', usuario: u })}
                      title="Redefinir senha"
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Key size={14} />
                    </button>
                    <button
                      onClick={() => toggleAtivo(u)}
                      title={u.ativo ? 'Desativar' : 'Ativar'}
                      disabled={ehVoce}
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      style={{ color: u.ativo ? '#10B981' : '#EF4444' }}
                    >
                      {u.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => setModal({ type: 'excluir', usuario: u })}
                      title="Excluir"
                      disabled={ehVoce}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal?.type === 'criar' && (
        <ModalCriar onClose={() => setModal(null)} onOk={async () => { setModal(null); await carregar(); }} />
      )}
      {modal?.type === 'editar' && (
        <ModalEditar
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onOk={async () => { setModal(null); await carregar(); }}
        />
      )}
      {modal?.type === 'senha' && (
        <ModalSenha
          usuario={modal.usuario}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'excluir' && (
        <ModalExcluir
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onOk={async () => { setModal(null); await carregar(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Modais
// ─────────────────────────────────────────────

function ModalShell({
  title, onClose, children,
}: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function ErroBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

function ModalCriar({ onClose, onOk }: { onClose: () => void; onOk: () => void }) {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', nivel: 'operador' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setSalvando(true); setErro('');
    try {
      await api.post('/admin/usuarios', form);
      onOk();
    } catch (e) {
      setErro(extrairErro(e, 'Erro ao criar usuário'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalShell title="Novo Usuário" onClose={onClose}>
      <ErroBox msg={erro} />
      <CampoTexto label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Nome completo" />
      <CampoTexto label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="email@smunitur.com.br" />
      <CampoTexto label="Senha" type="password" value={form.senha} onChange={(v) => setForm({ ...form, senha: v })} placeholder="Mín. 8 caracteres com letra e número" />
      <CampoNivel value={form.nivel} onChange={(v) => setForm({ ...form, nivel: v })} />
      <button
        onClick={salvar}
        disabled={salvando || !form.nome || !form.email || !form.senha}
        className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
        style={{ background: '#005ED5' }}
      >
        {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
        {salvando ? 'Criando...' : 'Criar Usuário'}
      </button>
    </ModalShell>
  );
}

function ModalEditar({ usuario, onClose, onOk }: { usuario: Usuario; onClose: () => void; onOk: () => void }) {
  const [form, setForm] = useState({ nome: usuario.nome, email: usuario.email, nivel: usuario.nivel });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setSalvando(true); setErro('');
    try {
      await api.put(`/admin/usuarios/${usuario.id}`, form);
      onOk();
    } catch (e) {
      setErro(extrairErro(e, 'Erro ao atualizar usuário'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalShell title={`Editar — ${usuario.nome}`} onClose={onClose}>
      <ErroBox msg={erro} />
      <CampoTexto label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
      <CampoTexto label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
      <CampoNivel value={form.nivel} onChange={(v) => setForm({ ...form, nivel: v as Usuario['nivel'] })} />
      <button
        onClick={salvar}
        disabled={salvando || !form.nome || !form.email}
        className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
        style={{ background: '#005ED5' }}
      >
        {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
        {salvando ? 'Salvando...' : 'Salvar Alterações'}
      </button>
    </ModalShell>
  );
}

function ModalSenha({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);

  const salvar = async () => {
    if (novaSenha !== confirma) {
      setErro('As senhas não conferem');
      return;
    }
    setSalvando(true); setErro('');
    try {
      await api.patch(`/admin/usuarios/${usuario.id}/senha`, { novaSenha });
      setOk(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setErro(extrairErro(e, 'Erro ao redefinir senha'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalShell title={`Redefinir senha — ${usuario.nome}`} onClose={onClose}>
      {ok ? (
        <div className="text-center py-4">
          <p className="text-green-600 font-semibold">Senha redefinida com sucesso!</p>
        </div>
      ) : (
        <>
          <ErroBox msg={erro} />
          <p className="text-xs text-gray-500">
            Defina uma nova senha para este usuário. Ele continuará podendo trocá-la na própria conta.
          </p>
          <CampoTexto label="Nova senha" type="password" value={novaSenha} onChange={setNovaSenha} placeholder="Mín. 8 caracteres com letra e número" />
          <CampoTexto label="Confirmar senha" type="password" value={confirma} onChange={setConfirma} placeholder="Repita a senha" />
          <button
            onClick={salvar}
            disabled={salvando || !novaSenha || !confirma}
            className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: '#005ED5' }}
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
            {salvando ? 'Salvando...' : 'Redefinir Senha'}
          </button>
        </>
      )}
    </ModalShell>
  );
}

function ModalExcluir({ usuario, onClose, onOk }: { usuario: Usuario; onClose: () => void; onOk: () => void }) {
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  const excluir = async () => {
    setExcluindo(true); setErro('');
    try {
      await api.delete(`/admin/usuarios/${usuario.id}`);
      onOk();
    } catch (e) {
      setErro(extrairErro(e, 'Erro ao excluir usuário'));
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <ModalShell title="Excluir Usuário" onClose={onClose}>
      <ErroBox msg={erro} />
      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
        <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Esta ação é <b>permanente</b>. O usuário <b>{usuario.nome}</b> ({usuario.email}) será excluído.
          Históricos de orçamentos que ele tenha movimentado permanecerão, sem autoria.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Digite <span className="font-bold text-red-600">EXCLUIR</span> para confirmar
        </label>
        <input
          value={confirma}
          onChange={(e) => setConfirma(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
        />
      </div>
      <button
        onClick={excluir}
        disabled={excluindo || confirma !== 'EXCLUIR'}
        className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
        style={{ background: '#EF4444' }}
      >
        {excluindo ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        {excluindo ? 'Excluindo...' : 'Excluir Definitivamente'}
      </button>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// Campos reutilizáveis
// ─────────────────────────────────────────────

function CampoTexto({
  label, value, onChange, type = 'text', placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}

function CampoNivel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nível</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white"
      >
        <option value="operador">Operador</option>
        <option value="admin">Admin</option>
        <option value="super_admin">Super Admin</option>
      </select>
    </div>
  );
}
