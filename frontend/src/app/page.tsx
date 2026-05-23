import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Produtos from '@/components/landing/Produtos';
import Servicos from '@/components/landing/Servicos';
import FormularioOrcamento from '@/components/landing/FormularioOrcamento';
import Acompanhamento from '@/components/landing/Acompanhamento';
import FAQ from '@/components/landing/FAQ';
import Contato from '@/components/landing/Contato';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Produtos />
        <Servicos />
        <FormularioOrcamento />
        <Acompanhamento />
        <FAQ />
        <Contato />
      </main>
      <Footer />
    </>
  );
}
