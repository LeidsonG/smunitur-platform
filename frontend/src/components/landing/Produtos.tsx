'use client';

import { Shirt, Wind, FlaskConical, Plus } from 'lucide-react';

const produtos = [
  {
    icon: Shirt,
    nome: 'Camisetas',
    desc: 'Camisetas personalizadas com bordado ou estampa. Gola redonda, polo, manga longa — o modelo que você precisar.',
    tags: ['Bordado', 'Silk Screen', 'Sublimação'],
  },
  {
    icon: Wind,
    nome: 'Moletons',
    desc: 'Moletons de alta qualidade com fechamento, capuz ou canguru. Personalizados para times, empresas e eventos.',
    tags: ['Capuz', 'Fechamento', 'Canguru'],
  },
  {
    icon: FlaskConical,
    nome: 'Jalecos',
    desc: 'Jalecos profissionais para saúde, indústria e serviços. Personalização com logo e nome bordados.',
    tags: ['Clínicas', 'Laboratórios', 'Indústria'],
  },
  {
    icon: Plus,
    nome: 'E muito mais...',
    desc: 'Calças, bonés, aventais, coletes e outros itens de confecção. Entre em contato para saber mais.',
    tags: ['Bonés', 'Aventais', 'Coletes'],
  },
];

export default function Produtos() {
  return (
    <section id="produtos" className="py-20 lg:py-32" style={{ background: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(255,148,0,0.1)', color: '#FF9400' }}
          >
            Nossos Produtos
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            O que a{' '}
            <span style={{ color: '#005ED5' }}>SM Unitur</span>
            {' '}faz
          </h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Confeccionamos peças de qualidade premium, adaptadas à identidade visual da sua marca.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {produtos.map(({ icon: Icon, nome, desc, tags }) => (
            <div
              key={nome}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-default border border-transparent hover:border-blue-100"
            >
              {/* Ícone */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200"
                style={{ background: 'linear-gradient(135deg, rgba(0,94,213,0.1), rgba(255,148,0,0.1))' }}
              >
                <Icon size={26} style={{ color: '#005ED5' }} />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3">{nome}</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{desc}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ background: 'rgba(0,94,213,0.08)', color: '#005ED5' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button
            onClick={() => document.querySelector('#orcamento')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 rounded-full text-white font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}
          >
            Solicitar Orçamento Agora
          </button>
        </div>
      </div>
    </section>
  );
}
