'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';

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
            className="p-2 rounded-xl border border-gray-200"
            aria-label="Abrir menu"
          >
            <Menu size={18} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-1">
            <span className="text-base font-black" style={{ color: '#005ED5' }}>SM</span>
            <span className="text-base font-black" style={{ color: '#FF9400' }}>UNITUR</span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
