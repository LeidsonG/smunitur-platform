'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shirt, Wind, FlaskConical, Package } from 'lucide-react';
import Reveal from './Reveal';
import api from '@/lib/api';

interface Categoria { id: number; nome: string; slug: string }
interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  imagem?: string;
  categoria: Categoria;
}

const ICONE_CATEGORIA: Record<string, React.ElementType> = {
  camisetas: Shirt,
  moletons: Wind,
  jalecos: FlaskConical,
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';

const sectionVariants = { hidden: {}, visible: {} };

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/produtos')
      .then(r => setProdutos(r.data.produtos))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="produtos" className="py-10 sm:py-12 lg:py-16" style={{ background: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {/* Header */}
          <Reveal asChild className="text-center mb-10 sm:mb-12 lg:mb-14">
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
          </Reveal>

          {/* Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-md border border-gray-100 animate-pulse overflow-hidden">
                  <div className="h-56 bg-gray-100" />
                  <div className="p-6">
                    <div className="h-5 bg-gray-100 rounded-lg mb-3 w-2/3" />
                    <div className="h-3 bg-gray-100 rounded-lg mb-2" />
                    <div className="h-3 bg-gray-100 rounded-lg w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : produtos.length === 0 ? null : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {produtos.map((produto, i) => {
                const Icon = ICONE_CATEGORIA[produto.categoria.slug] ?? Package;
                return (
                  <Reveal
                    key={produto.id}
                    delay={0.1 + i * 0.06}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 group cursor-default border border-gray-100 hover:border-blue-200 overflow-hidden"
                  >
                    {/* Foto do produto */}
                    <div
                      className="h-56"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0,94,213,0.08), rgba(255,148,0,0.08))',
                        overflow: 'hidden',
                        transform: 'translateZ(0)',
                      }}
                    >
                      {produto.imagem
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img
                            src={`${API_BASE}${produto.imagem}`}
                            alt={produto.nome}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          />
                        : <div className="w-full h-full flex items-center justify-center">
                            <Icon size={48} style={{ color: '#005ED5', opacity: 0.25 }} />
                          </div>
                      }
                    </div>

                    {/* Conteúdo */}
                    <div className="p-6">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium mb-3 inline-block"
                        style={{ background: 'rgba(0,94,213,0.08)', color: '#005ED5' }}
                      >
                        {produto.categoria.nome}
                      </span>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{produto.nome}</h3>
                      {produto.descricao && (
                        <p className="text-sm text-gray-600 leading-relaxed">{produto.descricao}</p>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}

          {/* CTA */}
          {!loading && (
            <Reveal asChild delay={0.1 + produtos.length * 0.06} className="text-center mt-10 sm:mt-12">
              <button
                type="button"
                onClick={() => document.querySelector('#orcamento')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-full text-white font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}
              >
                Solicitar Orçamento Agora
              </button>
            </Reveal>
          )}
        </motion.div>
      </div>
    </section>
  );
}
