'use client';

import { MessageCircle, Mail, MapPin, Clock } from 'lucide-react';
import Reveal from './Reveal';

// ATENÇÃO: Número temporário para ambiente de testes.
// Substituir pelo número oficial da SM Unitur antes de ir para produção.
const WHATSAPP_NUMBER = '5517981322215';

const contatos = [
  {
    icon: MessageCircle,
    titulo: 'WhatsApp',
    valor: '+55 (17) 98132-2215',
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    cor: '#25D366',
  },
  {
    icon: Mail,
    titulo: 'E-mail',
    valor: 'contato@smunitur.com.br',
    href: 'mailto:contato@smunitur.com.br',
    cor: '#005ED5',
  },
  {
    icon: MapPin,
    titulo: 'Localização',
    valor: 'São José do Rio Preto — SP',
    href: null,
    cor: '#FF9400',
  },
  {
    icon: Clock,
    titulo: 'Atendimento',
    valor: 'Seg–Sex: 8h–18h',
    href: null,
    cor: '#8B5CF6',
  },
];

export default function Contato() {
  return (
    <section id="contato" className="py-10 sm:py-12 lg:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Info */}
          <Reveal>
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ background: 'rgba(0,94,213,0.1)', color: '#005ED5' }}
            >
              Fale Conosco
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6 leading-tight">
              Pronto para
              <span className="block" style={{ color: '#005ED5' }}>
                começar seu projeto?
              </span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Entre em contato pelo canal de sua preferência. Nossa equipe responde em até 24 horas úteis
              e está pronta para criar o melhor projeto para você.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {contatos.map(({ icon: Icon, titulo, valor, href, cor }, i) => (
                <Reveal
                  key={titulo}
                  delay={i * 0.05}
                  className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${cor}18` }}
                  >
                    <Icon size={18} style={{ color: cor }} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">{titulo}</div>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-gray-800 hover:underline"
                        style={{ color: cor }}
                      >
                        {valor}
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-gray-800">{valor}</span>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          {/* Card CTA */}
          <Reveal
            delay={0.15}
            className="rounded-3xl p-6 sm:p-8 lg:p-10 text-white text-center"
            style={{ background: 'linear-gradient(135deg, #003A8C, #005ED5)' }}
          >
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-2xl font-bold mb-3">Fale pelo WhatsApp</h3>
            <p className="text-blue-200 mb-8 leading-relaxed">
              A forma mais rápida de tirar dúvidas e iniciar seu orçamento. Nossa equipe está online!
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl"
              style={{ background: '#25D366' }}
            >
              <MessageCircle size={22} />
              Iniciar Conversa
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
