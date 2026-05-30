'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, ToggleLeft, ToggleRight, X, Loader2,
  Pencil, Key, Trash2, AlertCircle, ShieldAlert, UserCircle,
  ShieldCheck, Shield, User,
} from 'lucide-react';
import api from '@/lib/api';
import { API_BASE } from '@/lib/api';

interface Usuario {
  id: number; nome: string; email: string;
  nivel: 'super_admin' | 'admin' | 'operador'; ativo: boolean; createdAt: string;
  foto?: string | null;
}

const NIVEL_CONFIG: Record<Usuario['nivel'], { label: string; cor: string; icon: typeof Shield }> = {
  super_admin: { label: 'Super Admin', cor: '#005ED5', icon: ShieldCheck },
  admin:       { label: 'Admin',       cor: '#8B5CF6', icon: Shield },
  operador:    { label: 'Operador',    cor: '#6B7280', icon: User },
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
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const toggleAtivo = async (u: Usuario) => {
    if (u.id === meuId) { alert('Você não pode desativar a si mesmo.'); return; }
    try {
      await api.patch(`/admin/usuarios/${u.id}/toggle`);
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x));
    } catch (e) { alert(extrairErro(e, 'Erro ao alterar status')); }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'criar' })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105 flex-shrink-0"
          style={{ background: '#005ED5' }}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo</span> Usuário
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {usuarios.map((u) => {
            const ehVoce = u.id === meuId;
            const cfg = NIVEL_CONFIG[u.nivel];
            const NivelIcon = cfg.icon;

            return (
              <div
                key={u.id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md ${!u.ativo ? 'opacity-60' : ''}`}
              >
                {/* Topo colorido */}
                <div className="h-2 w-full" style={{ background: cfg.cor }} />

                <div className="p-5">
                  {/* Avatar + nome */}
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: `${cfg.cor}18` }}
                    >
                      {u.foto
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={`${API_BASE}${u.foto}`} alt={u.nome} className="w-full h-full object-cover" />
                        : <UserCircle size={32} style={{ color: cfg.cor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900 text-base truncate">{u.nome}</p>
                        {ehVoce && (
                          <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 flex-shrink-0">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <NivelIcon size={12} style={{ color: cfg.cor }} />
                        <span className="text-xs font-semibold" style={{ color: cfg.cor }}>{cfg.label}</span>
                        <span className="text-gray-200 mx-1">·</span>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: u.ativo ? '#10B98118' : '#EF444418',
                            color: u.ativo ? '#10B981' : '#EF4444',
                          }}
                        >
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Data */}
                  <p className="text-xs text-gray-400 mb-4">
                    Desde {new Date(u.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => setModal({ type: 'editar', usuario: u })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-100 transition-colors"
                    >
                      <Pencil size={13} /> Editar
                    </button>
                    <button
                      onClick={() => setModal({ type: 'senha', usuario: u })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-100 transition-colors"
                    >
                      <Key size={13} /> Senha
                    </button>
                    <button
                      onClick={() => toggleAtivo(u)}
                      disabled={ehVoce}
                      title={u.ativo ? 'Desativar' : 'Ativar'}
                      className="p-2 rounded-xl border border-gray-100 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      style={{ color: u.ativo ? '#10B981' : '#EF4444' }}
                    >
                      {u.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => setModal({ type: 'excluir', usuario: u })}
                      disabled={ehVoce}
                      className="p-2 rounded-xl border border-gray-100 hover:bg-red-50 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      {modal?.type === 'criar' && (
        <ModalCriar onClose={() => setModal(null)} onOk={async () => { setModal(null); await carregar(); }} />
      )}
      {modal?.type === 'editar' && (
        <ModalEditar usuario={modal.usuario} onClose={() => setModal(null)} onOk={async () => { setModal(null); await carregar(); }} />
      )}
      {modal?.type === 'senha' && (
        <ModalSenha usuario={modal.usuario} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'excluir' && (
        <ModalExcluir usuario={modal.usuario} onClose={() => setModal(null)} onOk={async () => { setModal(null); await carregar(); }} />
      )}
    </div>
  );
}

// ─── Modais ───────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-5 space-y-4">{children}</div>
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

function CampoTexto({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={type === 'password' ? 'new-password' : 'off'}
        className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}

function CampoNivel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nível de acesso</label>
      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(NIVEL_CONFIG) as [Usuario['nivel'], typeof NIVEL_CONFIG[keyof typeof NIVEL_CONFIG]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center"
              style={value === key
                ? { borderColor: cfg.cor, background: `${cfg.cor}10` }
                : { borderColor: '#E5E7EB', background: 'transparent' }
              }
            >
              <Icon size={18} style={{ color: value === key ? cfg.cor : '#9CA3AF' }} />
              <span className="text-xs font-semibold" style={{ color: value === key ? cfg.cor : '#6B7280' }}>
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModalCriar({ onClose, onOk }: { onClose: () => void; onOk: () => void }) {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', nivel: 'operador' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setSalvando(true); setErro('');
    try { await api.post('/admin/usuarios', form); onOk(); }
    catch (e) { setErro(extrairErro(e, 'Erro ao criar usuário')); }
    finally { setSalvando(false); }
  };

  return (
    <ModalShell title="Novo Usuário" onClose={onClose}>
      <ErroBox msg={erro} />
      <CampoTexto label="Nome completo" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Nome completo" />
      <CampoTexto label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="email@smunitur.com.br" />
      <CampoTexto label="Senha" type="password" value={form.senha} onChange={(v) => setForm({ ...form, senha: v })} placeholder="Mín. 8 caracteres com letra e número" />
      <CampoNivel value={form.nivel} onChange={(v) => setForm({ ...form, nivel: v })} />
      <button
        onClick={salvar}
        disabled={salvando || !form.nome || !form.email || !form.senha}
        className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
        style={{ background: '#005ED5' }}
      >
        {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
        {salvando ? 'Criando...' : 'Criar Usuário'}
      </button>
    </ModalShell>
  );
}

function ModalEditar({ usuario, onClose, onOk }: { usuario: Usuario; onClose: () => void; onOk: () => void }) {
  const [form, setForm] = useState({ nome: usuario.nome, email: usuario.email, nivel: usuario.nivel as string });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    setSalvando(true); setErro('');
    try { await api.put(`/admin/usuarios/${usuario.id}`, form); onOk(); }
    catch (e) { setErro(extrairErro(e, 'Erro ao atualizar usuário')); }
    finally { setSalvando(false); }
  };

  return (
    <ModalShell title={`Editar — ${usuario.nome}`} onClose={onClose}>
      <ErroBox msg={erro} />
      <CampoTexto label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
      <CampoTexto label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
      <CampoNivel value={form.nivel} onChange={(v) => setForm({ ...form, nivel: v })} />
      <button
        onClick={salvar}
        disabled={salvando || !form.nome || !form.email}
        className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
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
    if (novaSenha !== confirma) { setErro('As senhas não conferem'); return; }
    setSalvando(true); setErro('');
    try {
      await api.patch(`/admin/usuarios/${usuario.id}/senha`, { novaSenha });
      setOk(true);
      setTimeout(onClose, 1500);
    } catch (e) { setErro(extrairErro(e, 'Erro ao redefinir senha')); }
    finally { setSalvando(false); }
  };

  return (
    <ModalShell title={`Redefinir senha — ${usuario.nome}`} onClose={onClose}>
      {ok ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#10B98118' }}>
            <Key size={22} style={{ color: '#10B981' }} />
          </div>
          <p className="text-green-600 font-semibold">Senha redefinida com sucesso!</p>
        </div>
      ) : (
        <>
          <ErroBox msg={erro} />
          <p className="text-xs text-gray-500">
            Defina uma nova senha para <strong>{usuario.nome}</strong>. Ele poderá trocá-la na própria conta depois.
          </p>
          <CampoTexto label="Nova senha" type="password" value={novaSenha} onChange={setNovaSenha} placeholder="Mín. 8 caracteres com letra e número" />
          <CampoTexto label="Confirmar senha" type="password" value={confirma} onChange={setConfirma} placeholder="Repita a senha" />
          <button
            onClick={salvar}
            disabled={salvando || !novaSenha || !confirma}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
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
    try { await api.delete(`/admin/usuarios/${usuario.id}`); onOk(); }
    catch (e) { setErro(extrairErro(e, 'Erro ao excluir usuário')); }
    finally { setExcluindo(false); }
  };

  return (
    <ModalShell title="Excluir Usuário" onClose={onClose}>
      <ErroBox msg={erro} />
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
        <ShieldAlert size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Esta ação é <strong>permanente</strong>. O usuário <strong>{usuario.nome}</strong> será excluído.
          Históricos de orçamentos que ele tenha movimentado permanecerão, sem autoria.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Digite <span className="font-bold text-red-600">EXCLUIR</span> para confirmar
        </label>
        <input
          value={confirma} onChange={(e) => setConfirma(e.target.value)}
          className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-red-400"
        />
      </div>
      <button
        onClick={excluir}
        disabled={excluindo || confirma !== 'EXCLUIR'}
        className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
        style={{ background: '#EF4444' }}
      >
        {excluindo ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        {excluindo ? 'Excluindo...' : 'Excluir Definitivamente'}
      </button>
    </ModalShell>
  );
}
