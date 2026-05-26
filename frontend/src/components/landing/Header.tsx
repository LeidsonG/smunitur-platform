'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Menu, X, Home, Shirt, Sparkles,
  ClipboardList, Package, HelpCircle, Phone,
} from 'lucide-react';

const navLinks = [
  { label: 'Início',     href: '#inicio',     icon: Home },
  { label: 'Serviços',   href: '#servicos',   icon: Sparkles },
  { label: 'Modelos',   href: '#modelos',   icon: Shirt },
  { label: 'Orçamento',  href: '#orcamento',  icon: ClipboardList },
  { label: 'Acompanhar', href: '#acompanhar', icon: Package },
  { label: 'FAQ',        href: '#faq',        icon: HelpCircle },
  { label: 'Contato',    href: '#contato',    icon: Phone },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: marca a seção mais próxima do topo do viewport
  useEffect(() => {
    const ids = navLinks.map((l) => l.href.slice(1));
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });

        let best = '';
        let bestTop = Infinity;
        visible.forEach((id) => {
          const el = document.getElementById(id);
          if (el) {
            const top = Math.abs(el.getBoundingClientRect().top);
            if (top < bestTop) { bestTop = top; best = id; }
          }
        });
        if (best) setActiveSection(best);
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Trava o scroll do body enquanto o drawer mobile está aberto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLink = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-lg' : 'bg-white/95 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <button
              type="button"
              onClick={() => handleLink('#inicio')}
              aria-label="Voltar ao início"
              className="flex items-center cursor-pointer focus:outline-none transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <Image
                src="/logo.png"
                alt="SM Unitur"
                width={140}
                height={48}
                className="h-10 lg:h-12 w-auto object-contain pointer-events-none"
                priority
              />
              <span className="text-xl lg:text-2xl font-black tracking-wide pointer-events-none">
                <span style={{ color: '#FF9400' }}>UNI</span>
                <span style={{ color: '#005ED5' }}>T</span>
                <span style={{ color: '#FF9400' }}>UR</span>
              </span>
            </button>

            {/* Nav Desktop */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = activeSection === link.href.slice(1);
                return (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => handleLink(link.href)}
                    className={`text-sm font-medium transition-colors duration-200 relative group ${
                      isActive ? 'text-[#005ED5]' : 'text-gray-700 hover:text-[#005ED5]'
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute -bottom-1 left-0 h-0.5 bg-[#FF9400] transition-all duration-300 pointer-events-none ${
                        isActive ? 'w-full' : 'w-0 group-hover:w-full'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            {/* CTA Desktop */}
            <a
              href="#orcamento"
              onClick={(e) => { e.preventDefault(); handleLink('#orcamento'); }}
              className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}
            >
              Solicitar Orçamento
            </a>

            {/* Hamburger Mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-3 -mr-1 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              <div
                className={`pointer-events-none transition-transform duration-300 ${
                  mobileOpen ? 'rotate-90' : 'rotate-0'
                }`}
              >
                {mobileOpen ? <X size={26} /> : <Menu size={26} />}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Drawer Mobile — overlay fullscreen com painel lateral */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Painel */}
        <aside
          className={`absolute right-0 top-0 h-full w-[88%] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
        >
          {/* Header do drawer */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Image
              src="/logo.png"
              alt="SM Unitur"
              width={120}
              height={40}
              className="h-9 w-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="p-2 -mr-2 rounded-lg text-gray-500 hover:text-gray-700 active:bg-gray-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Lista de navegação */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            {navLinks.map(({ label, href, icon: Icon }) => {
              const isActive = activeSection === href.slice(1);
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => handleLink(href)}
                  className={`flex items-center gap-3 w-full px-3 py-3.5 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-[#005ED5]'
                      : 'text-gray-700 active:bg-gray-50'
                  }`}
                >
                  <Icon
                    size={20}
                    className={`pointer-events-none ${
                      isActive ? 'text-[#005ED5]' : 'text-gray-400'
                    }`}
                  />
                  <span className="font-medium pointer-events-none">{label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF9400] pointer-events-none" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* CTA no rodapé do drawer */}
          <div className="p-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => handleLink('#orcamento')}
              className="w-full py-4 rounded-full text-white font-semibold text-base active:scale-[0.98] transition-transform shadow-lg"
              style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}
            >
              Solicitar Orçamento
            </button>
            <p className="text-xs text-center text-gray-400 mt-3">
              Resposta em até 24h úteis
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
