import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = 'https://smunitur.com.br';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SM Unitur | Uniformes e Camisetas Personalizadas em São José do Rio Preto",
  description:
    "Camisetas, moletons, jalecos e uniformes personalizados em São José do Rio Preto — SP. A SM Unitur atende empresas, times, escolas e eventos com bordado, silk e sublimação. Solicite seu orçamento online com acompanhamento em tempo real.",
  keywords: [
    "uniforme personalizado São José do Rio Preto",
    "camiseta bordada SJRP",
    "jaleco personalizado Rio Preto SP",
    "moletom personalizado",
    "uniforme corporativo Rio Preto",
    "camiseta silk screen",
    "confecção de uniformes SP",
    "SM Unitur",
    "uniformes personalizados",
    "bordado em uniformes",
  ],
  authors: [{ name: "SM Unitur" }],
  creator: "SM Unitur",
  openGraph: {
    title: "SM Unitur | Uniformes Personalizados em São José do Rio Preto",
    description:
      "Camisetas, moletons, jalecos e uniformes com bordado, silk e sublimação. Orçamento online rápido com acompanhamento em tempo real.",
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "SM Unitur",
  },
  twitter: {
    card: "summary_large_image",
    title: "SM Unitur | Uniformes Personalizados",
    description: "Uniformes e peças personalizadas em São José do Rio Preto — SP.",
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "SM Unitur",
  description: "Confecção de uniformes, camisetas, moletons e jalecos personalizados.",
  url: SITE_URL,
  telephone: "+55-17-98134-5270",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Tenerife, s/n — Vila Dias",
    addressLocality: "São José do Rio Preto",
    addressRegion: "SP",
    postalCode: "15050-120",
    addressCountry: "BR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "-20.8197",
    longitude: "-49.3794",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
  priceRange: "$$",
  hasMap: `https://maps.google.com/maps?q=Rua+Tenerife,+Vila+Dias,+São+José+do+Rio+Preto+SP`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full" data-scroll-behavior="smooth">
      <head>
        <meta name="color-scheme" content="light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
