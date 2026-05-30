'use client';

import { MessageCircle, Mail, MapPin, Clock, Phone } from 'lucide-react';
import Reveal from './Reveal';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';

const ENDERECO = 'Rua Tenerife, Vila Dias, São José do Rio Preto — SP, 15050-120';
const TELEFONE = '(17) 98134-5270';
const EMAIL = 'contato@smunitur.com.br';

const contatos = [
  {
    icon: Phone,
    titulo: 'WhatsApp / Telefone',
    valor: TELEFONE,
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    cor: '#25D366',
  },
  {
    icon: Mail,
    titulo: 'E-mail',
    valor: EMAIL,
    href: `mailto:${EMAIL}`,
    cor: '#005ED5',
  },
  {
    icon: MapPin,
    titulo: 'Endereço',
    valor: ENDERECO,
    href: `https://maps.google.com/maps?q=Rua+Tenerife,+Vila+Dias,+São+José+do+Rio+Preto+SP+15050-120`,
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

const MAPS_EMBED =
  'https://maps.google.com/maps?q=Rua+Tenerife,+Vila+Dias,+S%C3%A3o+Jos%C3%A9+do+Rio+Preto+SP+15050-120&output=embed&z=16&hl=pt-BR';

export default function Contato() {
  return (
    <section id="contato" className="py-16 sm:py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <Reveal className="text-center mb-10 sm:mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(0,94,213,0.1)', color: '#005ED5' }}
          >
            Fale Conosco
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
            Pronto para
            <span className="block" style={{ color: '#005ED5' }}>começar seu projeto?</span>
          </h2>
          <p className="text-gray-600 text-lg mt-4 max-w-2xl mx-auto">
            Entre em contato pelo canal de sua preferência. Nossa equipe responde em até 24 horas úteis.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Info + cards */}
          <div className="space-y-4">
            {contatos.map(({ icon: Icon, titulo, valor, href, cor }, i) => (
              <Reveal
                key={titulo}
                delay={i * 0.05}
                className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${cor}18` }}
                >
                  <Icon size={18} style={{ color: cor }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 font-medium mb-0.5">{titulo}</div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-gray-800 hover:underline break-words"
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

            {/* CTA WhatsApp */}
            <Reveal delay={0.2}>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white text-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg"
                style={{ background: '#25D366' }}
              >
                <MessageCircle size={22} />
                Iniciar Conversa no WhatsApp
              </a>
            </Reveal>
          </div>

          {/* Mapa */}
          <Reveal delay={0.1} className="rounded-2xl overflow-hidden border border-gray-100 shadow-md">
            <iframe
              src={MAPS_EMBED}
              width="100%"
              height="420"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização SM Unitur — São José do Rio Preto SP"
            />
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <a
                href={`https://maps.google.com/maps?q=Rua+Tenerife,+Vila+Dias,+São+José+do+Rio+Preto+SP+15050-120`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium flex items-center gap-1.5 hover:underline"
                style={{ color: '#005ED5' }}
              >
                <MapPin size={12} />
                {ENDERECO}
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
