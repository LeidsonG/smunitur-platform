'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, UserCircle } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';
import { API_BASE } from '@/lib/api';

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
  const [adminFoto, setAdminFoto] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('smunitur_admin');
      if (raw) setAdminFoto(JSON.parse(raw).foto ?? null);
    } catch { /* ignore */ }
    const handler = () => {
      try {
        const raw = localStorage.getItem('smunitur_admin');
        if (raw) setAdminFoto(JSON.parse(raw).foto ?? null);
      } catch { /* ignore */ }
    };
    window.addEventListener('admin-atualizado', handler);
    return () => window.removeEventListener('admin-atualizado', handler);
  }, []);

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
          <div className="flex items-center gap-1 flex-1">
            <span className="text-base font-black" style={{ color: '#005ED5' }}>SM</span>
            <span className="text-base font-black" style={{ color: '#FF9400' }}>UNITUR</span>
          </div>
          {PAGE_TITLES[pathname] && (
            <span className="text-xs font-medium text-gray-400 truncate max-w-24">
              {PAGE_TITLES[pathname]}
            </span>
          )}
          <button
            onClick={() => router.push('/admin/perfil')}
            className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center"
            style={{ background: 'rgba(0,94,213,0.08)' }}
            aria-label="Meu perfil"
          >
            {adminFoto
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`${API_BASE}${adminFoto}`} alt="Perfil" className="w-full h-full object-cover" />
              : <UserCircle size={18} style={{ color: '#005ED5' }} />}
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
