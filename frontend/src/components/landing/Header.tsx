'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Início', href: '#inicio' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Produtos', href: '#produtos' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Orçamento', href: '#orcamento' },
  { label: 'Acompanhar', href: '#acompanhar' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contato', href: '#contato' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLink = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
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
            className="flex items-center focus:outline-none"
          >
            <Image
              src="/logo.png"
              alt="SM Unitur"
              width={140}
              height={48}
              className="h-10 lg:h-12 w-auto object-contain pointer-events-none"
              priority
            />
          </button>

          {/* Nav Desktop */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => handleLink(link.href)}
                className="text-sm font-medium text-gray-700 hover:text-[#005ED5] transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FF9400] group-hover:w-full transition-all duration-300 pointer-events-none" />
              </button>
            ))}
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

      {/* Menu Mobile */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white border-t border-gray-100 px-4 pb-4 pt-2">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleLink(link.href)}
              className="block w-full text-left py-4 px-2 text-gray-700 font-medium border-b border-gray-50 hover:text-[#005ED5] active:text-[#005ED5] active:bg-gray-50 transition-colors duration-200"
            >
              {link.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleLink('#orcamento')}
            className="mt-4 w-full py-4 rounded-full text-white font-semibold text-base active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}
          >
            Solicitar Orçamento
          </button>
        </div>
      </div>
    </header>
  );
}
