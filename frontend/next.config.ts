import type { NextConfig } from "next";

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
    remotePatterns: [],
    localPatterns: [
      { pathname: '/uploads/**' },
      { pathname: '/**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3001/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
