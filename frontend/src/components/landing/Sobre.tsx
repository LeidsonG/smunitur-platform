'use client';

import { CheckCircle, Shirt, Truck, HeartHandshake } from 'lucide-react';
import Reveal from './Reveal';

const diferenciais = [
  {
    icon: Shirt,
    titulo: 'Qualidade Premium',
    desc: 'Tecidos selecionados, acabamento impecável e atenção a cada detalhe da sua peça.',
  },
  {
    icon: CheckCircle,
    titulo: 'Personalização Total',
    desc: 'Bordado, sublimação, silk screen — do modelo ao tamanho, tudo do seu jeito.',
  },
  {
    icon: Truck,
    titulo: 'Entrega no Prazo',
    desc: 'Comprometimento real com os prazos acordados. Acompanhe cada etapa online.',
  },
  {
    icon: HeartHandshake,
    titulo: 'Atendimento Humanizado',
    desc: 'Equipe dedicada para entender sua necessidade e oferecer a melhor solução.',
  },
];

export default function Sobre() {
  return (
    <section id="sobre" className="py-10 sm:py-12 lg:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Conteúdo */}
          <Reveal>
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ background: 'rgba(0,94,213,0.1)', color: '#005ED5' }}
            >
              Quem Somos
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6 leading-tight">
              Mais de uma década
              <span className="block" style={{ color: '#005ED5' }}>
                vestindo equipes
              </span>
              com excelência
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              A <strong>SM Unitur</strong> nasceu da paixão por confecção de qualidade e do compromisso
              com cada cliente. Ao longo dos anos, construímos um processo produtivo eficiente que
              garante peças personalizadas com acabamento premium.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              Atendemos empresas, escolas, equipes esportivas, eventos e qualquer projeto que precise
              de uniformes ou roupas personalizadas com identidade própria.
            </p>
            <a
              href="#contato"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#contato')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{ background: '#005ED5' }}
            >
              Fale Conosco
            </a>
          </Reveal>

          {/* Diferenciais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {diferenciais.map(({ icon: Icon, titulo, desc }, i) => (
              <Reveal
                key={titulo}
                delay={i * 0.06}
                className="p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 group bg-white"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200"
                  style={{ background: 'rgba(0,94,213,0.1)' }}
                >
                  <Icon size={22} style={{ color: '#005ED5' }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{titulo}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
