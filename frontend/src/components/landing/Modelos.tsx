'use client';

import { useEffect, useMemo, useState } from 'react';
import Reveal from './Reveal';
import api, { API_BASE } from '@/lib/api';
import { iconePorNome } from '@/lib/linhaIcones';

interface Linha {
  id: number;
  nome: string;
  slug: string;
  cor: string | null;
  icone: string | null;
}
interface Modelo {
  id: number;
  nome: string;
  descricao?: string;
  imagem?: string;
  linha: Linha;
}

const COR_PADRAO = '#005ED5';

// Tempo por modelo para a animação completa do marquee. Multiplicado pela
// quantidade de modelos para que listas maiores rolem proporcionalmente
// mais lento — sensação de "passeando" pelos itens.
const SEGUNDOS_POR_MODELO = 5;

export default function Modelos() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/modelos')
      .then(r => setModelos(r.data.modelos))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Backend já ordena por linha → alfabético; replicamos como segurança
  // caso alguma resposta venha fora de ordem.
  const modelosOrdenados = useMemo(() => {
    return [...modelos].sort((a, b) => {
      const linhaCmp = a.linha.nome.localeCompare(b.linha.nome, 'pt-BR');
      if (linhaCmp !== 0) return linhaCmp;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [modelos]);

  const duracaoMarquee = Math.max(30, modelosOrdenados.length * SEGUNDOS_POR_MODELO);

  return (
    <section id="modelos" className="pt-16 sm:pt-20 lg:pt-28 pb-10 sm:pb-14 lg:pb-20" style={{ background: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal asChild className="text-center mb-10 sm:mb-12 lg:mb-14">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(255,148,0,0.1)', color: '#FF9400' }}
          >
            Nossos Modelos
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
      </div>

      {/* Carrossel — sai do container para ocupar a largura total da viewport */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-100 animate-pulse overflow-hidden">
                <div className="h-40 sm:h-56 lg:h-72 bg-gray-100" />
                <div className="p-3 sm:p-5 lg:p-6">
                  <div className="h-4 bg-gray-100 rounded-lg mb-2 w-2/3" />
                  <div className="h-3 bg-gray-100 rounded-lg mb-1.5 hidden sm:block" />
                  <div className="h-3 bg-gray-100 rounded-lg w-4/5 hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : modelosOrdenados.length === 0 ? null : (
        <div
          className="overflow-hidden marquee-fade"
          aria-label="Carrossel de modelos disponíveis"
        >
          <ul
            className="marquee-track gap-4 sm:gap-5 py-2"
            style={{ '--marquee-duration': `${duracaoMarquee}s` } as React.CSSProperties}
          >
            {/* Lista duplicada para criar o loop infinito sem "salto".
                aria-hidden na segunda cópia evita que leitores de tela leiam tudo duas vezes. */}
            {modelosOrdenados.map((m) => (
              <ModeloCard key={`a-${m.id}`} modelo={m} />
            ))}
            {modelosOrdenados.map((m) => (
              <ModeloCard key={`b-${m.id}`} modelo={m} ariaHidden />
            ))}
          </ul>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!loading && (
          <Reveal asChild delay={0.1} className="text-center mt-10 sm:mt-12">
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
      </div>
    </section>
  );
}

// ─── Card individual do carrossel ──────────────────────────────────────────

function ModeloCard({ modelo, ariaHidden = false }: { modelo: Modelo; ariaHidden?: boolean }) {
  const Icon = iconePorNome(modelo.linha.icone);
  const cor = modelo.linha.cor ?? COR_PADRAO;
  // `${cor}1A` = cor com alpha ~10% (1A em hex). Usado para o fundo tênue do
  // badge e placeholder.
  const corBg = `${cor}1A`;

  return (
    <li
      aria-hidden={ariaHidden}
      className="bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 group border border-gray-100 overflow-hidden flex-shrink-0 w-56 sm:w-64 lg:w-72"
    >
      <div
        className="h-40 sm:h-48 lg:h-56"
        style={{
          background: `linear-gradient(135deg, ${corBg}, rgba(255,148,0,0.08))`,
          overflow: 'hidden',
          transform: 'translateZ(0)',
        }}
      >
        {modelo.imagem
          // eslint-disable-next-line @next/next/no-img-element
          ? <img
              src={`${API_BASE}${modelo.imagem}`}
              alt={modelo.nome}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          : <div className="w-full h-full flex items-center justify-center">
              <Icon size={32} className="sm:w-12 sm:h-12" style={{ color: cor, opacity: 0.35 }} />
            </div>
        }
      </div>

      <div className="p-3 sm:p-4 lg:p-5">
        <span
          className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium mb-2 sm:mb-3 inline-block"
          style={{ background: corBg, color: cor }}
        >
          {modelo.linha.nome}
        </span>
        <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-1 sm:mb-2 leading-tight">{modelo.nome}</h3>
        {modelo.descricao && (
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3 hidden sm:block">{modelo.descricao}</p>
        )}
      </div>
    </li>
  );
}
