'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
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

// Intervalo entre rotações automáticas (ms). 4s dá tempo de leitura sem
// frustrar o usuário que está só passando o olho na vitrine.
const AUTOPLAY_MS = 4000;

export default function Modelos() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    api.get('/modelos')
      .then(r => setModelos(r.data.modelos))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Backend já ordena por linha → alfabético; replicamos como segurança caso
  // alguma resposta venha fora de ordem.
  const modelosOrdenados = useMemo(() => {
    return [...modelos].sort((a, b) => {
      const linhaCmp = a.linha.nome.localeCompare(b.linha.nome, 'pt-BR');
      if (linhaCmp !== 0) return linhaCmp;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [modelos]);

  // Atualiza setas/barra de progresso conforme o usuário rola (ou o autoplay
  // rola). Memoizado porque é addEventListener target.
  const atualizarEstado = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    setCanScrollLeft(t.scrollLeft > 4);
    setCanScrollRight(t.scrollLeft < max - 4);
    setProgresso(max > 0 ? Math.min(1, t.scrollLeft / max) : 1);
  }, []);

  useEffect(() => {
    atualizarEstado();
    const t = trackRef.current;
    if (!t) return;
    t.addEventListener('scroll', atualizarEstado, { passive: true });
    window.addEventListener('resize', atualizarEstado);
    return () => {
      t.removeEventListener('scroll', atualizarEstado);
      window.removeEventListener('resize', atualizarEstado);
    };
  }, [atualizarEstado, modelosOrdenados.length]);

  // Auto-rotação. Quando chega no fim, volta suavemente para o início.
  // Pausa enquanto o usuário interage (hover, foco, touch).
  useEffect(() => {
    if (!autoplay || modelosOrdenados.length === 0) return;
    const id = window.setInterval(() => {
      const t = trackRef.current;
      if (!t) return;
      const max = t.scrollWidth - t.clientWidth;
      if (t.scrollLeft >= max - 4) {
        t.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        // Rola ~80% da viewport para que o próximo card encaixe no snap.
        t.scrollBy({ left: Math.min(t.clientWidth * 0.8, 320), behavior: 'smooth' });
      }
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay, modelosOrdenados.length]);

  const navegar = (dir: 1 | -1) => {
    const t = trackRef.current;
    if (!t) return;
    t.scrollBy({ left: dir * Math.min(t.clientWidth * 0.8, 320), behavior: 'smooth' });
  };

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

        {/* Carrossel */}
        {loading ? (
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
        ) : modelosOrdenados.length === 0 ? null : (
          <div
            className="relative"
            onMouseEnter={() => setAutoplay(false)}
            onMouseLeave={() => setAutoplay(true)}
            onFocusCapture={() => setAutoplay(false)}
            onBlurCapture={() => setAutoplay(true)}
          >
            {/* Seta esquerda */}
            <button
              type="button"
              onClick={() => navegar(-1)}
              disabled={!canScrollLeft}
              aria-label="Modelos anteriores"
              className="hidden sm:flex absolute left-0 sm:-left-2 lg:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white shadow-lg items-center justify-center text-gray-700 hover:text-white transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none hover:scale-110 active:scale-95"
              style={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#005ED5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <ChevronLeft size={20} />
            </button>

            {/* Track com scroll horizontal nativo + snap */}
            <div
              ref={trackRef}
              role="region"
              aria-roledescription="carrossel"
              aria-label="Modelos disponíveis"
              className="overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
            >
              <ul className="flex gap-4 sm:gap-5 py-2">
                {modelosOrdenados.map((m, i) => (
                  <ModeloCard
                    key={m.id}
                    modelo={m}
                    indice={i + 1}
                    total={modelosOrdenados.length}
                  />
                ))}
              </ul>
            </div>

            {/* Seta direita */}
            <button
              type="button"
              onClick={() => navegar(1)}
              disabled={!canScrollRight}
              aria-label="Próximos modelos"
              className="hidden sm:flex absolute right-0 sm:-right-2 lg:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white shadow-lg items-center justify-center text-gray-700 hover:text-white transition-all duration-200 disabled:opacity-0 disabled:pointer-events-none hover:scale-110 active:scale-95"
              style={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#005ED5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <ChevronRight size={20} />
            </button>

            {/* Controles: barra de progresso + play/pause */}
            <div className="flex items-center justify-center gap-4 mt-6 sm:mt-8">
              <div
                className="w-32 sm:w-40 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(0,94,213,0.12)' }}
                aria-hidden="true"
              >
                <div
                  className="h-full transition-[width] duration-500 ease-out rounded-full"
                  style={{ width: `${Math.max(progresso * 100, 6)}%`, background: '#005ED5' }}
                />
              </div>
              <button
                type="button"
                onClick={() => setAutoplay(v => !v)}
                aria-label={autoplay ? 'Pausar rotação automática' : 'Retomar rotação automática'}
                title={autoplay ? 'Pausar' : 'Reproduzir'}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              >
                {autoplay ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* CTA */}
        {!loading && modelosOrdenados.length > 0 && (
          <Reveal asChild delay={0.1} className="text-center mt-8 sm:mt-10">
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

function ModeloCard({ modelo, indice, total }: { modelo: Modelo; indice: number; total: number }) {
  const Icon = iconePorNome(modelo.linha.icone);
  const cor = modelo.linha.cor ?? COR_PADRAO;
  // `${cor}1A` = cor com alpha ~10% (1A em hex). Usado para o fundo tênue do
  // badge e do gradiente do placeholder.
  const corBg = `${cor}1A`;

  return (
    <li
      role="group"
      aria-roledescription="slide"
      aria-label={`${indice} de ${total}: ${modelo.nome}`}
      className="snap-start bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 group border border-gray-100 overflow-hidden flex-shrink-0 w-60 sm:w-64 lg:w-72"
    >
      <div
        className="h-44 sm:h-48 lg:h-56 relative"
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
              <Icon size={48} style={{ color: cor, opacity: 0.35 }} />
            </div>
        }
      </div>

      <div className="p-4 lg:p-5">
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold mb-2 inline-block"
          style={{ background: corBg, color: cor }}
        >
          {modelo.linha.nome}
        </span>
        <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-1 leading-tight">{modelo.nome}</h3>
        {modelo.descricao && (
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3">{modelo.descricao}</p>
        )}
      </div>
    </li>
  );
}
