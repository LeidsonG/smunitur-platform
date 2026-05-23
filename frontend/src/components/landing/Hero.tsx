'use client';

import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background image com blur e escurecimento leve */}
      <div className="absolute inset-0">
        <Image
          src="/background.png"
          alt=""
          fill
          className="object-cover"
          style={{ filter: 'blur(2px) brightness(0.82)' }}
          priority
        />
      </div>

      {/* Overlay de cor para manter a identidade */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(0,58,140,0.55) 0%, rgba(0,94,213,0.35) 50%, rgba(10,22,40,0.55) 100%)' }}
      />

      {/* Escurecimento lateral direito para dar ênfase à logo */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to left, rgba(10,22,40,1) 0%, rgba(0,58,140,0.5) 40%, transparent 65%)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-40 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Coluna esquerda — conteúdo */}
          <div className="flex-1 text-left">

            {/* Título */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white mb-5 lg:mb-6 leading-tight hero-title">
              Uniformes e Roupas
              <span className="block" style={{ color: '#FF9400' }}>Personalizadas</span>
              com Excelência
            </h1>

            {/* Subtítulo */}
            <p className="text-base sm:text-xl text-blue-100 max-w-xl mb-8 lg:mb-10 leading-relaxed">
              Camisetas, moletons, jalecos e muito mais. Qualidade premium, prazo garantido
              e personalização completa para sua empresa ou equipe.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <a
                href="#orcamento"
                onClick={(e) => { e.preventDefault(); document.querySelector('#orcamento')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-base sm:text-lg font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-2xl text-center"
                style={{ background: '#FF9400' }}
              >
                Solicitar Orçamento Grátis
              </a>
              <a
                href="#produtos"
                onClick={(e) => { e.preventDefault(); document.querySelector('#produtos')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-base sm:text-lg font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 text-center"
                style={{ border: '2px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)' }}
              >
                Ver Produtos
              </a>
            </div>
          </div>

          {/* Coluna direita — logo */}
          <div className="hidden lg:flex flex-shrink-0 items-center justify-center">
            <Image
              src="/logo5.png"
              alt="SM Unitur"
              width={440}
              height={440}
              className="object-contain"
              style={{ width: 'auto', maxHeight: '400px' }}
              priority
            />
          </div>

        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => document.querySelector('#servicos')?.scrollIntoView({ behavior: 'smooth' })}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white opacity-60 hover:opacity-100 transition-opacity animate-bounce"
        aria-label="Rolar para baixo"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  );
}
