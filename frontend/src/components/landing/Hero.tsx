'use client';

import { useEffect, useRef } from 'react';
import { ChevronDown, Star, Users, Award, Clock } from 'lucide-react';

const stats = [
  { icon: Star, label: 'Anos de Experiência', value: '10+' },
  { icon: Users, label: 'Clientes Atendidos', value: '500+' },
  { icon: Award, label: 'Peças Produzidas', value: '50k+' },
  { icon: Clock, label: 'Prazo Garantido', value: '100%' },
];

export default function Hero() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (headingRef.current) {
      headingRef.current.style.opacity = '1';
      headingRef.current.style.transform = 'translateY(0)';
    }
  }, []);

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #003A8C 0%, #005ED5 50%, #0A1628 100%)',
      }}
    >
      {/* Padrão decorativo de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: '#FF9400' }}
        />
        <div
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: '#FF9400' }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: '#ffffff' }}
        />
        {/* Linhas decorativas */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-5"
            style={{
              top: `${10 + i * 20}%`,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #ffffff, transparent)',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium"
            style={{ background: 'rgba(255,148,0,0.15)', color: '#FF9400', border: '1px solid rgba(255,148,0,0.3)' }}
          >
            <Star size={14} fill="currentColor" />
            Confecção Premium desde 2014
          </div>

          {/* Título */}
          <h1
            ref={headingRef}
            className="text-4xl sm:text-5xl lg:text-7xl font-black text-white mb-6 leading-tight"
            style={{
              opacity: 0,
              transform: 'translateY(30px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            Uniformes e Roupas
            <span className="block" style={{ color: '#FF9400' }}>
              Personalizadas
            </span>
            com Excelência
          </h1>

          {/* Subtítulo */}
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Camisetas, moletons, jalecos e muito mais. Qualidade premium, prazo garantido
            e personalização completa para sua empresa ou equipe.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="#orcamento"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#orcamento')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 rounded-full text-lg font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xl"
              style={{ background: '#FF9400' }}
            >
              Solicitar Orçamento Grátis
            </a>
            <a
              href="#produtos"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#produtos')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 rounded-full text-lg font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ border: '2px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)' }}
            >
              Ver Produtos
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {stats.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-2xl p-5 text-center backdrop-blur-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <Icon size={24} className="mx-auto mb-2 opacity-80" style={{ color: '#FF9400' }} />
                <div className="text-3xl font-black text-white">{value}</div>
                <div className="text-xs text-blue-200 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => document.querySelector('#sobre')?.scrollIntoView({ behavior: 'smooth' })}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white opacity-60 hover:opacity-100 transition-opacity animate-bounce"
        aria-label="Rolar para baixo"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  );
}
