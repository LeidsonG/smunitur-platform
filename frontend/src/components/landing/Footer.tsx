'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Mail, Lock, MapPin } from 'lucide-react';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: '#0A1628' }} className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 pb-6 sm:pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 sm:mb-10">
          {/* Logo + desc */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="SM Unitur"
                width={140}
                height={48}
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Especialistas em confecção de uniformes, camisetas, moletons e jalecos personalizados
              com qualidade premium e entrega no prazo.
            </p>
            <div className="flex items-start gap-2 mt-4 text-xs text-gray-500">
              <MapPin size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#FF9400' }} />
              <span>Rua Tenerife, Vila Dias<br />São José do Rio Preto — SP, 15050-120</span>
            </div>
            <div className="flex gap-3 mt-4">
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
            <ul className="space-y-2.5 text-sm text-gray-400">
              {[
                { label: 'Início', href: '#inicio' },
                { label: 'Serviços', href: '#servicos' },
                { label: 'Modelos', href: '#modelos' },
                { label: 'Orçamento', href: '#orcamento' },
                { label: 'Acompanhar Pedido', href: '#acompanhar' },
                { label: 'FAQ', href: '#faq' },
                { label: 'Contato', href: '#contato' },
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
