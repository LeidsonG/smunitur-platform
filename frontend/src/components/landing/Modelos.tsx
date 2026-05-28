'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

// 45 px/s → card de ~260 px passa em ~6 s. Lento o suficiente para leitura
// confortável sem parecer parado.
const SCROLL_PX_S = 45;

export default function Modelos() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [modalModelo, setModalModelo] = useState<Modelo | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  // Pausa o scroll automático enquanto o usuário interage (hover / drag / foco)
  const pausado = useRef(false);
  // Estado do drag de mouse
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  // Detecta se o usuário arrastou (> 5px) para não confundir drag com clique
  const dragMoved = useRef(false);

  useEffect(() => {
    api.get('/modelos')
      .then(r => setModelos(r.data.modelos))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Ordenação primária: linha (alfabético). Secundária: nome do modelo.
  const modelosOrdenados = useMemo(() => {
    return [...modelos].sort((a, b) => {
      const lc = a.linha.nome.localeCompare(b.linha.nome, 'pt-BR');
      return lc !== 0 ? lc : a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [modelos]);

  // Sincroniza visibilidade das setas com a posição de scroll
  const syncArrows = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    setCanScrollLeft(t.scrollLeft > 4);
    setCanScrollRight(t.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    syncArrows();
    const t = trackRef.current;
    if (!t) return;
    t.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);
    return () => {
      t.removeEventListener('scroll', syncArrows);
      window.removeEventListener('resize', syncArrows);
    };
  }, [syncArrows, modelosOrdenados.length]);

  // ── Auto-scroll contínuo com requestAnimationFrame ──────────────────────────
  // Incrementa scrollLeft diretamente a cada frame. Quando chega no fim,
  // volta suavemente ao início com scrollTo({behavior:'smooth'}) e espera
  // a animação terminar antes de retomar.
  useEffect(() => {
    if (modelosOrdenados.length === 0) return;

    let rafId: number;
    let lastTime: number | null = null;
    let returning = false; // true durante a animação de retorno ao início

    const tick = (now: number) => {
      if (!pausado.current && !returning) {
        if (lastTime !== null) {
          const dt = (now - lastTime) / 1000; // segundos desde o último frame
          const t = trackRef.current;
          if (t) {
            const max = t.scrollWidth - t.clientWidth;
            if (t.scrollLeft >= max - 2) {
              // Chegou ao fim → volta suavemente ao início
              returning = true;
              t.scrollTo({ left: 0, behavior: 'smooth' });
              const aguardar = () => {
                if ((trackRef.current?.scrollLeft ?? 999) <= 4) {
                  returning = false;
                } else {
                  requestAnimationFrame(aguardar);
                }
              };
              requestAnimationFrame(aguardar);
            } else {
              t.scrollLeft += SCROLL_PX_S * dt;
            }
          }
        }
        lastTime = now;
      } else {
        // Quando pausado, zera o lastTime para não pular ao retomar
        lastTime = null;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [modelosOrdenados.length]);

  // ── Navegação pelas setas ──────────────────────────────────────────────────
  const navegar = (dir: 1 | -1) => {
    const t = trackRef.current;
    if (!t) return;
    t.scrollBy({ left: dir * Math.min(t.clientWidth * 0.75, 280), behavior: 'smooth' });
  };

  // ── Drag com mouse (toque é nativo via overflow-x: auto) ──────────────────
  const handleOrcamento = (modelo: Modelo) => {
    setModalModelo(null);
    sessionStorage.setItem('smunitur_preselect', JSON.stringify({
      linhaId: modelo.linha.id,
      modeloId: modelo.id,
    }));
    window.dispatchEvent(new CustomEvent('smunitur:preselect', {
      detail: { linhaId: modelo.linha.id, modeloId: modelo.id },
    }));
    document.querySelector('#orcamento')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const t = trackRef.current;
    if (!t) return;
    isDragging.current = true;
    dragMoved.current = false;
    pausado.current = true;
    dragStartX.current = e.clientX;
    dragScrollLeft.current = t.scrollLeft;
    t.style.cursor = 'grabbing';
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current || !trackRef.current) return;
      if (Math.abs(e.clientX - dragStartX.current) > 5) dragMoved.current = true;
      trackRef.current.scrollLeft =
        dragScrollLeft.current - (e.clientX - dragStartX.current);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (trackRef.current) trackRef.current.style.cursor = '';
      // Pequena pausa antes de retomar para não "engolir" o gesto do usuário
      setTimeout(() => { pausado.current = false; }, 800);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <section
      id="modelos"
      className="pt-16 sm:pt-20 lg:pt-28 pb-10 sm:pb-14 lg:pb-20"
      style={{ background: '#F8F9FA' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
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

        {/* ── Carrossel ───────────────────────────────────────────────────── */}
        {loading ? (
          // Skeleton de carregamento
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-100 animate-pulse overflow-hidden"
              >
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
            // Pausa o auto-scroll enquanto o ponteiro está sobre o carrossel
            onMouseEnter={() => { pausado.current = true; }}
            onMouseLeave={() => { if (!isDragging.current) pausado.current = false; }}
            onFocusCapture={() => { pausado.current = true; }}
            onBlurCapture={() => { if (!isDragging.current) pausado.current = false; }}
          >
            {/* Seta esquerda */}
            <ArrowBtn
              dir="left"
              disabled={!canScrollLeft}
              onClick={() => navegar(-1)}
              aria-label="Modelos anteriores"
            />

            {/* Track com scroll horizontal nativo — sem snap para permitir
                o scroll contínuo; o toque desliza nativamente pelo overflow */}
            <div
              ref={trackRef}
              role="region"
              aria-roledescription="carrossel"
              aria-label="Modelos disponíveis"
              className="overflow-x-auto scrollbar-none -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
              style={{ cursor: 'grab', userSelect: 'none' }}
              onMouseDown={onMouseDown}
            >
              <ul className="flex gap-4 sm:gap-5 py-2">
                {modelosOrdenados.map((m, i) => (
                  <ModeloCard
                    key={m.id}
                    modelo={m}
                    indice={i + 1}
                    total={modelosOrdenados.length}
                    onOrcamento={(modelo) => {
                      if (!dragMoved.current) setModalModelo(modelo);
                    }}
                  />
                ))}
              </ul>
            </div>

            {/* Seta direita */}
            <ArrowBtn
              dir="right"
              disabled={!canScrollRight}
              onClick={() => navegar(1)}
              aria-label="Próximos modelos"
            />
          </div>
        )}

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        {!loading && modelosOrdenados.length > 0 && (
          <Reveal asChild delay={0.1} className="text-center mt-8 sm:mt-10">
            <button
              type="button"
              onClick={() =>
                document.querySelector('#orcamento')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="px-8 py-4 rounded-full text-white font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}
            >
              Solicitar Orçamento Agora
            </button>
          </Reveal>
        )}
      </div>

      {/* Modal de confirmação de orçamento */}
      {modalModelo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setModalModelo(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0,94,213,0.08)' }}>
              {(() => { const I = iconePorNome(modalModelo.linha.icone); return <I size={28} style={{ color: '#005ED5' }} />; })()}
            </div>
            <h3 className="text-xl font-black text-gray-900 text-center mb-1">
              Gostou desse modelo?
            </h3>
            <p className="text-gray-500 text-sm text-center mb-5">
              Quer solicitar um orçamento para <strong className="text-gray-700">{modalModelo.nome}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModalModelo(null)}
                className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={() => handleOrcamento(modalModelo)}
                className="flex-1 py-2.5 rounded-full text-white font-bold text-sm transition-all hover:scale-105 shadow-md"
                style={{ background: 'linear-gradient(135deg, #005ED5, #0047A8)' }}
              >
                Quero orçamento!
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Botão de seta (prev / next) ─────────────────────────────────────────────

function ArrowBtn({
  dir,
  disabled,
  onClick,
  'aria-label': ariaLabel,
}: {
  dir: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
  'aria-label': string;
}) {
  const isLeft = dir === 'left';
  const Icon = isLeft ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        'absolute top-1/2 -translate-y-1/2 z-10',
        'w-9 h-9 sm:w-10 sm:h-10 rounded-full',
        'bg-white flex items-center justify-center text-gray-700',
        'transition-all duration-200',
        'disabled:opacity-0 disabled:pointer-events-none',
        'hover:scale-110 active:scale-95',
        isLeft
          ? 'left-0 sm:-left-3 lg:-left-5'
          : 'right-0 sm:-right-3 lg:-right-5',
      ].join(' ')}
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#005ED5';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.color = '';
      }}
    >
      <Icon size={18} />
    </button>
  );
}

// ─── Card individual do carrossel ─────────────────────────────────────────────

function ModeloCard({
  modelo,
  indice,
  total,
  onOrcamento,
}: {
  modelo: Modelo;
  indice: number;
  total: number;
  onOrcamento: (m: Modelo) => void;
}) {
  const Icon = iconePorNome(modelo.linha.icone);
  const cor = modelo.linha.cor ?? COR_PADRAO;
  // `${cor}1A` = cor com ~10% de opacidade (hex alpha). Fundo tênue do badge
  // e do gradiente do placeholder quando não há imagem.
  const corBg = `${cor}1A`;

  return (
    <li
      role="group"
      aria-roledescription="slide"
      aria-label={`${indice} de ${total}: ${modelo.nome}`}
      onClick={() => onOrcamento(modelo)}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 group border border-gray-100 overflow-hidden flex-shrink-0 w-60 sm:w-64 lg:w-72 cursor-pointer"
    >
      {/* Imagem / placeholder */}
      <div
        className="h-44 sm:h-48 lg:h-56 relative"
        style={{
          background: `linear-gradient(135deg, ${corBg}, rgba(255,148,0,0.08))`,
          overflow: 'hidden',
          transform: 'translateZ(0)',
        }}
      >
        {modelo.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_BASE}${modelo.imagem}`}
            alt={modelo.nome}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={48} style={{ color: cor, opacity: 0.35 }} />
          </div>
        )}
      </div>

      {/* Texto */}
      <div className="p-4 lg:p-5">
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold mb-2 inline-block"
          style={{ background: corBg, color: cor }}
        >
          {modelo.linha.nome}
        </span>
        <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-1 leading-tight">
          {modelo.nome}
        </h3>
        {modelo.descricao && (
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3">
            {modelo.descricao}
          </p>
        )}
      </div>
    </li>
  );
}
