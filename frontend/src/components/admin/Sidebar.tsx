'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Factory,
  LogOut,
  ChevronRight,
  UserCircle,
  Menu,
  X,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orcamentos', icon: FileText, label: 'Orçamentos' },
  { href: '/admin/producao', icon: Factory, label: 'Produção' },
  { href: '/admin/modelos', icon: Package, label: 'Modelos' },
  { href: '/admin/especificacoes', icon: SlidersHorizontal, label: 'Especificações', nivel: ['super_admin', 'admin'] as string[] },
  { href: '/admin/usuarios', icon: Users, label: 'Usuários', nivel: ['super_admin', 'admin'] as string[] },
];

interface AdminInfo { id: number; nome: string; email: string; nivel: 'super_admin' | 'admin' | 'operador'; foto?: string | null }

const NIVEL_LABEL: Record<AdminInfo['nivel'], string> = {
  super_admin: 'Super Admin', admin: 'Admin', operador: 'Operador',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const carregarAdmin = () => {
      try {
        const raw = localStorage.getItem('smunitur_admin');
        if (raw) setAdmin(JSON.parse(raw));
      } catch { /* ignore */ }
    };
    carregarAdmin();
    window.addEventListener('admin-atualizado', carregarAdmin);
    return () => window.removeEventListener('admin-atualizado', carregarAdmin);
  }, []);

  // Fecha o menu ao trocar de rota
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('smunitur_token');
    localStorage.removeItem('smunitur_admin');
    router.push('/admin/login');
  };

  const irPara = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const itensVisiveis = navItems.filter((item) => {
    if (!item.nivel) return true;
    return admin && item.nivel.includes(admin.nivel);
  });

  const conteudoSidebar = (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-xl font-black" style={{ color: '#005ED5' }}>SM</span>
            <span className="text-xl font-black" style={{ color: '#FF9400' }}>UNITUR</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Painel Admin</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Card do usuário */}
      {admin && (
        <button
          onClick={() => irPara('/admin/perfil')}
          className="mx-3 mt-3 mb-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
          style={{
            background: pathname === '/admin/perfil' ? 'rgba(0,94,213,0.2)' : 'rgba(255,255,255,0.04)',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(0,94,213,0.25)' }}
          >
            {admin.foto
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`${API_BASE}${admin.foto}`} alt={admin.nome} className="w-full h-full object-cover" />
              : <UserCircle size={22} style={{ color: '#005ED5' }} />}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-white truncate">{admin.nome}</p>
            <p className="text-[11px] text-gray-400 truncate">{NIVEL_LABEL[admin.nivel]}</p>
          </div>
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {itensVisiveis.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => irPara(href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
              style={{
                background: active ? 'rgba(0,94,213,0.2)' : 'transparent',
                color: active ? '#005ED5' : '#9CA3AF',
              }}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight size={14} style={{ color: '#005ED5' }} />}
            </button>
          );
        })}
      </nav>

      {/* Ver site + Logout */}
      <div className="px-3 pb-6 space-y-1">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-blue-300 hover:bg-blue-400/10 transition-all duration-200"
        >
          <ExternalLink size={18} />
          <span className="flex-1 text-left">Ver site</span>
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Botão hambúrguer (mobile) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2.5 rounded-xl shadow-md bg-white border border-gray-200"
        aria-label="Abrir menu"
      >
        <Menu size={18} className="text-gray-700" />
      </button>

      {/* Sidebar desktop — sticky para não rolar com o conteúdo */}
      <aside
        className="hidden lg:flex flex-col w-64 h-screen sticky top-0 flex-shrink-0"
        style={{ background: '#0A1628' }}
      >
        {conteudoSidebar}
      </aside>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="lg:hidden fixed top-0 left-0 z-50 flex flex-col w-[85vw] max-w-72 h-full"
            style={{ background: '#0A1628' }}
          >
            {conteudoSidebar}
          </aside>
        </>
      )}
    </>
  );
}
