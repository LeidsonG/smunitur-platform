import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SM Unitur — Uniformes e Camisetas Personalizadas em São José do Rio Preto';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0A1628',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Faixa decorativa topo */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(to right, #005ED5, #FF9400)',
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 28 }}>
          <span style={{ fontSize: 100, fontWeight: 900, color: '#005ED5', letterSpacing: '-2px' }}>SM</span>
          <span style={{ fontSize: 100, fontWeight: 900, color: '#FF9400', letterSpacing: '-2px' }}>UNITUR</span>
        </div>

        {/* Divisor */}
        <div
          style={{
            width: 80,
            height: 4,
            borderRadius: 99,
            background: '#FF9400',
            marginBottom: 32,
          }}
        />

        {/* Tagline */}
        <p
          style={{
            fontSize: 34,
            color: '#94A3B8',
            textAlign: 'center',
            maxWidth: 760,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Uniformes e Peças Personalizadas
        </p>
        <p
          style={{
            fontSize: 26,
            color: '#475569',
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          São José do Rio Preto — SP
        </p>

        {/* Chips de serviços */}
        <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Camisetas', 'Moletons', 'Jalecos', 'Bordado', 'Sublimação'].map((s) => (
            <div
              key={s}
              style={{
                background: 'rgba(0,94,213,0.15)',
                border: '1px solid rgba(0,94,213,0.3)',
                borderRadius: 99,
                padding: '8px 20px',
                fontSize: 20,
                color: '#60A5FA',
              }}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Faixa decorativa rodapé */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(to right, #FF9400, #005ED5)',
          }}
        />
      </div>
    ),
    size
  );
}
