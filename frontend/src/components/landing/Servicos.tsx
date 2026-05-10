'use client';

import { Paintbrush, Layers, Scissors, BarChart3, Package, Headphones } from 'lucide-react';

const servicos = [
  {
    icon: Paintbrush,
    titulo: 'Bordado Computadorizado',
    desc: 'Bordados de alta precisão com fios de qualidade. Ideal para logos, nomes e detalhes finos.',
  },
  {
    icon: Layers,
    titulo: 'Sublimação Digital',
    desc: 'Estampas full color que não desbotam. Perfeito para camisetas de time e eventos.',
  },
  {
    icon: Scissors,
    titulo: 'Silk Screen',
    desc: 'Serigrafia tradicional para grandes quantidades. Custo-benefício imbatível em pedidos acima de 50 peças.',
  },
  {
    icon: BarChart3,
    titulo: 'Consultoria de Uniforme',
    desc: 'Ajudamos a escolher o melhor tipo de peça, tecido e acabamento para sua equipe.',
  },
  {
    icon: Package,
    titulo: 'Embalagem e Entrega',
    desc: 'Peças embaladas individualmente e entregues no prazo. Envio para todo o Brasil.',
  },
  {
    icon: Headphones,
    titulo: 'Suporte Pós-Venda',
    desc: 'Garantia de qualidade e suporte após a entrega. Sua satisfação é nossa prioridade.',
  },
];

export default function Servicos() {
  return (
    <section id="servicos" className="py-12 lg:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(0,94,213,0.1)', color: '#005ED5' }}
          >
            Nossos Serviços
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Do conceito à entrega,
            <span className="block" style={{ color: '#FF9400' }}>
              cuidamos de tudo
            </span>
          </h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Oferecemos serviços completos de confecção personalizada para atender qualquer demanda.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicos.map(({ icon: Icon, titulo, desc }, i) => (
            <div
              key={titulo}
              className="relative p-6 rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white"
            >
              {/* Gradiente no hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(0,94,213,0.04), rgba(255,148,0,0.04))' }}
              />

              <div className="relative z-10">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: i % 2 === 0 ? 'rgba(0,94,213,0.1)' : 'rgba(255,148,0,0.1)' }}
                >
                  <Icon size={22} style={{ color: i % 2 === 0 ? '#005ED5' : '#FF9400' }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-lg">{titulo}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
