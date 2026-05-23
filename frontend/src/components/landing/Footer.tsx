'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Mail, Lock } from 'lucide-react';

// ATENÇÃO: Número temporário para testes. Substituir pelo número oficial antes de ir para produção.
const WHATSAPP_NUMBER = '5517981322215';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: '#0A1628' }} className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 sm:mb-10">
          {/* Logo + desc */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="SM Unitur"
                width={140}
                height={48}
                className="h-10 object-contain brightness-0 invert"
                style={{ width: 'auto' }}
              />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Especialistas em confecção de uniformes, camisetas, moletons e jalecos personalizados
              com qualidade premium e entrega no prazo.
            </p>
            <div className="flex gap-3 mt-5">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                style={{ background: '#25D366' }}
              >
                <MessageCircle size={16} />
              </a>
              <a
                href="mailto:contato@smunitur.com.br"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                style={{ background: '#005ED5' }}
              >
                <Mail size={16} />
              </a>
            </div>
          </div>

          {/* Links rápidos */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">
              Navegação
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {[
                { label: 'Início', href: '#inicio' },
                { label: 'Produtos', href: '#produtos' },
                { label: 'Serviços', href: '#servicos' },
                { label: 'FAQ', href: '#faq' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="hover:text-white transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Serviços */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">
              Serviços
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {['Camisetas', 'Moletons', 'Jalecos', 'Bordado', 'Sublimação', 'Silk Screen'].map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <span>© {year} SM Unitur. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <span>
              Desenvolvido por{' '}
              <span style={{ color: '#FF9400' }}>Leidson F. Gonçalves</span>
            </span>
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-100 opacity-40 hover:bg-white/10"
              style={{ color: '#9CA3AF' }}
            >
              <Lock size={11} />
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
