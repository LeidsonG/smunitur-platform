'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Factory,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orcamentos', icon: FileText, label: 'Orçamentos' },
  { href: '/admin/producao', icon: Factory, label: 'Produção' },
  { href: '/admin/produtos', icon: Package, label: 'Produtos' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuários' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('smunitur_token');
    localStorage.removeItem('smunitur_admin');
    router.push('/admin/login');
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-64 min-h-screen"
      style={{ background: '#0A1628' }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-1">
          <span className="text-xl font-black" style={{ color: '#005ED5' }}>SM</span>
          <span className="text-xl font-black" style={{ color: '#FF9400' }}>UNITUR</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Painel Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
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

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
