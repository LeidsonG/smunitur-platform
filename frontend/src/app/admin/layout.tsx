'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':     'Dashboard',
  '/admin/orcamentos':    'Orçamentos',
  '/admin/producao':      'Produção',
  '/admin/modelos':       'Modelos',
  '/admin/especificacoes':'Especificações',
  '/admin/usuarios':      'Usuários',
  '/admin/perfil':        'Meu Perfil',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setOk(true);
      return;
    }
    const token = localStorage.getItem('smunitur_token');
    if (!token) {
      router.replace('/admin/login');
    } else {
      setOk(true);
    }
  }, [pathname, router]);

  if (!ok) return null;
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra de topo mobile — no fluxo da página, não sobrepõe conteúdo */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl border border-gray-200 flex-shrink-0"
            aria-label="Abrir menu"
          >
            <Menu size={18} className="text-gray-700" />
          </button>
          <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
            {PAGE_TITLES[pathname] ?? 'Admin'}
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
