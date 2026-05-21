'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Reveal from './Reveal';

const faqs = [
  {
    pergunta: 'Qual é a quantidade mínima para pedido?',
    resposta:
      'Aceitamos pedidos a partir de 1 peça para a maioria dos produtos. Para técnicas como silk screen, recomendamos pedidos acima de 50 unidades para melhor custo-benefício. Entre em contato para verificar a disponibilidade do seu pedido.',
  },
  {
    pergunta: 'Como funciona o processo de orçamento?',
    resposta:
      'É simples! Preencha o formulário de orçamento nesta página com os detalhes do seu pedido. Nossa equipe analisará e retornará com um orçamento personalizado via WhatsApp em até 24 horas úteis.',
  },
  {
    pergunta: 'Qual é o prazo de produção?',
    resposta:
      'O prazo varia conforme o tipo de produto, técnica e quantidade. Em média, pedidos simples levam de 7 a 15 dias úteis após aprovação. Casos urgentes podem ser analisados — fale conosco.',
  },
  {
    pergunta: 'Posso enviar minha arte/logo?',
    resposta:
      'Sim! Você pode enviar sua arte ou logo no formulário de orçamento. Aceitamos arquivos em PNG, JPG ou PDF (prefira alta resolução). Nossa equipe avaliará a qualidade da arte para o processo escolhido.',
  },
  {
    pergunta: 'Vocês atendem empresas e pessoa física?',
    resposta:
      'Sim! Atendemos tanto pessoas físicas quanto jurídicas. Para empresas, emitimos nota fiscal e oferecemos condições especiais para pedidos recorrentes.',
  },
  {
    pergunta: 'Como posso acompanhar meu pedido?',
    resposta:
      'Após aprovação do orçamento, você receberá um número de orçamento. Com ele, basta acessar a seção "Acompanhar Pedido" neste site e inserir o número para ver o status atual da sua produção em tempo real.',
  },
  {
    pergunta: 'Quais formas de pagamento são aceitas?',
    resposta:
      'Aceitamos PIX, cartão de crédito ou débito, transferência bancária e dinheiro. Para empresas com pedidos recorrentes, trabalhamos também com boleto bancário. Consulte condições especiais ao solicitar seu orçamento.',
  },
];

export default function FAQ() {
  const [aberto, setAberto] = useState<number | null>(null);

  return (
    <section id="faq" className="py-10 sm:py-12 lg:py-16" style={{ background: '#F8F9FA' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10 sm:mb-12">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(255,148,0,0.1)', color: '#FF9400' }}
          >
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            Perguntas{' '}
            <span style={{ color: '#005ED5' }}>frequentes</span>
          </h2>
          <p className="text-gray-600">Encontre respostas para as dúvidas mais comuns.</p>
        </Reveal>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = aberto === i;
            return (
              <Reveal
                key={i}
                delay={i * 0.05}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-blue-100 transition-colors duration-200"
              >
                <button
                  type="button"
                  onClick={() => setAberto(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-resposta-${i}`}
                  className="w-full text-left px-5 sm:px-6 py-5 flex items-center justify-between gap-4 group active:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors text-sm sm:text-base">
                    {faq.pergunta}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`pointer-events-none flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    style={{ color: '#005ED5' }}
                  />
                </button>

                <div
                  id={`faq-resposta-${i}`}
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 sm:px-6 pb-5 text-gray-600 leading-relaxed text-sm">
                      {faq.resposta}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
