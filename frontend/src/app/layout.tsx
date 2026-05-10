import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SM Unitur | Confecção de Uniformes e Roupas Personalizadas",
  description:
    "SM Unitur — especialista em confecção de uniformes, camisetas, moletons e jalecos personalizados. Solicite seu orçamento e acompanhe a produção online.",
  keywords: [
    "uniformes personalizados", "confecção de camisetas", "moletons personalizados",
    "jalecos", "bordado", "estamparia", "SM Unitur",
  ],
  openGraph: {
    title: "SM Unitur | Confecção Personalizada",
    description: "Uniformes, camisetas e roupas personalizadas com qualidade premium.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
