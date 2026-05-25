import type { NextConfig } from "next";

/**
 * Configuração do Next.js.
 *
 * - `images.remotePatterns` aceita imagens servidas pela API do backend.
 *   Em produção, defina `NEXT_PUBLIC_API_URL` apontando para o host real
 *   (ex.: https://smunitur.com.br/api) — o derivado abaixo libera o
 *   carregamento das imagens daquele mesmo host.
 *
 * - `rewrites` em dev faz o front (porta 3000) "embutir" o backend
 *   (porta 3001) no mesmo origin — evita CORS local. Em produção o Nginx
 *   cuida do roteamento e os rewrites não são usados.
 */

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const apiOrigin = (() => {
  try { return new URL(apiUrl).origin; } catch { return 'http://localhost:3001'; }
})();
const apiOriginUrl = new URL(apiOrigin);

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Libera o dev server para acesso por IP local e túneis externos (ex.: ngrok).
  // Sem isso, o Next.js 15+ bloqueia /_next/static/* vindo de origens diferentes
  // de localhost, e a hidratação falha em qualquer dispositivo que não seja a
  // máquina onde o dev server roda.
  allowedDevOrigins: [
    '192.168.0.106',
    'localhost',
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.app',
    '*.ngrok.io',
  ],
  images: {
    remotePatterns: [
      {
        protocol: apiOriginUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: apiOriginUrl.hostname,
        port: apiOriginUrl.port || undefined,
        pathname: '/uploads/**',
      },
    ],
    localPatterns: [
      { pathname: '/uploads/**' },
      { pathname: '/**' },
    ],
  },
  // Em produção, o Nginx faz o roteamento — não usar rewrites.
  ...(isProd ? {} : {
    async rewrites() {
      return [
        { source: '/api/:path*',     destination: `${apiOrigin}/api/:path*` },
        { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
      ];
    },
  }),
};

export default nextConfig;
