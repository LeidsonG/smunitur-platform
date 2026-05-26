'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const res = await api.post('/auth/login', { email, senha });
      localStorage.setItem('smunitur_token', res.data.token);
      localStorage.setItem('smunitur_admin', JSON.stringify(res.data.admin));
      router.push('/admin/dashboard');
    } catch {
      setErro('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #003A8C 0%, #005ED5 50%, #0A1628 100%)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="SM Unitur"
            width={260}
            height={86}
            className="h-20 w-auto object-contain brightness-0 invert mx-auto mb-3"
            priority
          />
          <p className="text-blue-200 text-sm">Painel Administrativo</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h1>
          <p className="text-gray-500 text-sm mb-6">Entre com suas credenciais de acesso</p>

          {erro && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 mb-4">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{erro}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  placeholder="Seu e-mail"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              style={{ background: '#005ED5' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Voltar ao site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
