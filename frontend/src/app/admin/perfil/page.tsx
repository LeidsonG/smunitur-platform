'use client';

import { useEffect, useState } from 'react';
import { UserCircle, Lock, Loader2, AlertCircle, CheckCircle, Mail, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

interface Admin {
  id: number; nome: string; email: string;
  nivel: 'super_admin' | 'admin' | 'operador';
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
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setAdmin(res.data.admin))
      .finally(() => setLoading(false));
  }, []);

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(''); setSucesso(false);

    if (novaSenha !== confirma) {
      setErro('A confirmação não coincide com a nova senha.');
      return;
    }
    if (novaSenha === senhaAtual) {
      setErro('A nova senha deve ser diferente da atual.');
      return;
    }

    setSalvando(true);
    try {
      await api.patch('/auth/change-password', { senhaAtual, novaSenha });
      setSucesso(true);
      setSenhaAtual(''); setNovaSenha(''); setConfirma('');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; errors?: Array<{ msg?: string }> } } };
      setErro(
        err.response?.data?.error
        || err.response?.data?.errors?.[0]?.msg
        || 'Erro ao alterar senha'
      );
    } finally {
      setSalvando(false);
    }
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
        {/* Dados */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,94,213,0.1)' }}
            >
              <UserCircle size={32} style={{ color: '#005ED5' }} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{admin.nome}</p>
              <p className="text-xs text-gray-500">Cadastrado em {new Date(admin.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

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

          <p className="mt-5 text-xs text-gray-400">
            Para alterar seu nome, e-mail ou nível, entre em contato com um Super Administrador.
          </p>
        </div>

        {/* Trocar senha */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Lock size={18} style={{ color: '#005ED5' }} />
            Alterar Senha
          </h2>
          <p className="text-xs text-gray-500 mb-5">Mantenha sua conta segura usando uma senha forte e exclusiva.</p>

          {erro && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 mb-4">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}
          {sucesso && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700 mb-4">
              <CheckCircle size={16} />
              Senha alterada com sucesso!
            </div>
          )}

          <form onSubmit={trocarSenha} className="space-y-4">
            <Field label="Senha atual">
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="Nova senha">
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <Field label="Confirmar nova senha">
              <input
                type="password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>

            <p className="text-xs text-gray-400">
              Mínimo de 8 caracteres, contendo letras e números.
            </p>

            <button
              type="submit"
              disabled={salvando || !senhaAtual || !novaSenha || !confirma}
              className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: '#005ED5' }}
            >
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {salvando ? 'Salvando...' : 'Alterar Senha'}
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
