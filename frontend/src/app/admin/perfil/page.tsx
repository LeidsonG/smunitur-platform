'use client';

import { useEffect, useRef, useState } from 'react';
import { UserCircle, Lock, Loader2, AlertCircle, CheckCircle, Mail, ShieldCheck, Camera, Pencil } from 'lucide-react';
import api, { API_BASE } from '@/lib/api';

interface Admin {
  id: number; nome: string; email: string;
  nivel: 'super_admin' | 'admin' | 'operador';
  foto?: string | null;
  createdAt: string;
}

const NIVEL_LABEL: Record<Admin['nivel'], string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  operador: 'Operador',
};

export default function PerfilPage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const [sucessoSenha, setSucessoSenha] = useState(false);

  const [nomeEdit, setNomeEdit] = useState('');
  const [editandoNome, setEditandoNome] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [erroNome, setErroNome] = useState('');
  const [sucessoNome, setSucessoNome] = useState(false);

  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setAdmin(res.data.admin))
      .finally(() => setLoading(false));
  }, []);

  const abrirEdicaoNome = () => {
    setNomeEdit(admin?.nome ?? '');
    setErroNome('');
    setSucessoNome(false);
    setEditandoNome(true);
  };

  const salvarNome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEdit.trim()) return;
    setSalvandoNome(true); setErroNome(''); setSucessoNome(false);
    try {
      const res = await api.patch('/auth/me/nome', { nome: nomeEdit.trim() });
      const novoNome = res.data.admin.nome;
      setAdmin(prev => prev ? { ...prev, nome: novoNome } : prev);
      // Atualiza sidebar
      try {
        const raw = localStorage.getItem('smunitur_admin');
        if (raw) localStorage.setItem('smunitur_admin', JSON.stringify({ ...JSON.parse(raw), nome: novoNome }));
      } catch { /* ignore */ }
      setSucessoNome(true);
      setEditandoNome(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; errors?: Array<{ msg?: string }> } } };
      setErroNome(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Erro ao salvar nome');
    } finally { setSalvandoNome(false); }
  };

  const trocarFoto = async (file: File) => {
    setEnviandoFoto(true); setErroFoto('');
    try {
      const fd = new FormData();
      fd.append('foto', file);
      const res = await api.put('/auth/me/foto', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAdmin(prev => prev ? { ...prev, foto: res.data.foto } : prev);
      // Atualiza também o localStorage para o Sidebar
      try {
        const raw = localStorage.getItem('smunitur_admin');
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem('smunitur_admin', JSON.stringify({ ...parsed, foto: res.data.foto }));
        }
      } catch { /* ignore */ }
    } catch {
      setErroFoto('Erro ao enviar foto. Tente novamente.');
    } finally { setEnviandoFoto(false); }
  };

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha(''); setSucessoSenha(false);
    if (novaSenha !== confirma) { setErroSenha('A confirmação não coincide com a nova senha.'); return; }
    if (novaSenha === senhaAtual) { setErroSenha('A nova senha deve ser diferente da atual.'); return; }
    setSalvandoSenha(true);
    try {
      await api.patch('/auth/change-password', { senhaAtual, novaSenha });
      setSucessoSenha(true);
      setSenhaAtual(''); setNovaSenha(''); setConfirma('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; errors?: Array<{ msg?: string }> } } };
      setErroSenha(
        err.response?.data?.error
        || err.response?.data?.errors?.[0]?.msg
        || 'Erro ao alterar senha'
      );
    } finally { setSalvandoSenha(false); }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
      </div>
    );
  }

  if (!admin) {
    return <div className="flex-1 p-8 text-gray-500">Não foi possível carregar o perfil.</div>;
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Seus dados de acesso ao sistema</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Dados + foto */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-2 border-gray-100"
                style={{ background: 'rgba(0,94,213,0.1)' }}>
                {admin.foto
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`${API_BASE}${admin.foto}`} alt={admin.nome} className="w-full h-full object-cover" />
                  : <UserCircle size={36} style={{ color: '#005ED5' }} />}
              </div>
              <button
                onClick={() => fotoInputRef.current?.click()}
                disabled={enviandoFoto}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow transition-all hover:scale-110 disabled:opacity-60"
                style={{ background: '#005ED5' }}
                title="Alterar foto">
                {enviandoFoto
                  ? <Loader2 size={12} className="text-white animate-spin" />
                  : <Camera size={12} className="text-white" />}
              </button>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) trocarFoto(f); }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 truncate">{admin.nome}</p>
                <button
                  onClick={abrirEdicaoNome}
                  className="p-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex-shrink-0"
                  title="Editar nome"
                >
                  <Pencil size={13} />
                </button>
              </div>
              <p className="text-xs text-gray-500">Cadastrado em {new Date(admin.createdAt).toLocaleDateString('pt-BR')}</p>
              {erroFoto && <p className="text-xs text-red-500 mt-0.5">{erroFoto}</p>}
              {sucessoNome && <p className="text-xs text-green-600 mt-0.5">Nome atualizado!</p>}
            </div>
          </div>

          {/* Formulário inline de edição de nome */}
          {editandoNome && (
            <form onSubmit={salvarNome} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Novo nome</label>
              <div className="flex gap-2">
                <input
                  value={nomeEdit}
                  onChange={e => setNomeEdit(e.target.value)}
                  maxLength={100}
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  placeholder="Seu nome"
                />
                <button
                  type="submit"
                  disabled={salvandoNome || !nomeEdit.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: '#005ED5' }}
                >
                  {salvandoNome ? <Loader2 size={14} className="animate-spin" /> : null}
                  {salvandoNome ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoNome(false)}
                  className="px-3 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
              </div>
              {erroNome && <p className="text-xs text-red-500 mt-1.5">{erroNome}</p>}
            </form>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Mail size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">E-mail</p>
                <p className="font-medium text-gray-900">{admin.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <ShieldCheck size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Nível de acesso</p>
                <p className="font-medium text-gray-900">{NIVEL_LABEL[admin.nivel]}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trocar senha */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Lock size={18} style={{ color: '#005ED5' }} />
            Alterar Senha
          </h2>
          <p className="text-xs text-gray-500 mb-5">Mantenha sua conta segura usando uma senha forte e exclusiva.</p>

          {erroSenha && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 mb-4">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{erroSenha}</span>
            </div>
          )}
          {sucessoSenha && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700 mb-4">
              <CheckCircle size={16} />
              Senha alterada com sucesso!
            </div>
          )}

          <form onSubmit={trocarSenha} className="space-y-4">
            <Field label="Senha atual">
              <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
                autoComplete="current-password" required />
            </Field>
            <Field label="Nova senha">
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label="Confirmar nova senha">
              <input type="password" value={confirma} onChange={e => setConfirma(e.target.value)}
                autoComplete="new-password" minLength={8} required />
            </Field>
            <p className="text-xs text-gray-400">Mínimo de 8 caracteres, contendo letras e números.</p>
            <button type="submit"
              disabled={salvandoSenha || !senhaAtual || !novaSenha || !confirma}
              className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: '#005ED5' }}>
              {salvandoSenha ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {salvandoSenha ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  const child = children as React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        {...child.props}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
      />
    </div>
  );
}
