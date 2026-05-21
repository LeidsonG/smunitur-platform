'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shirt, Wind, FlaskConical, Package,
  Plus, Minus, Upload, Send, Loader2,
  CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
} from 'lucide-react';
import api from '@/lib/api';
import { gerarLinkWhatsApp } from '@/lib/whatsapp';
import Reveal from './Reveal';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Categoria { id: number; nome: string; slug: string }
interface Produto { id: number; nome: string; descricao?: string }
interface Opcao { id: number; valor: string }
interface Atributo { id: number; nome: string; obrigatorio: boolean; opcoes: Opcao[] }

const ICONE_CATEGORIA: Record<string, React.ElementType> = {
  camisetas: Shirt,
  moletons: Wind,
  jalecos: FlaskConical,
};

const schema = z.object({
  nome_cliente: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  telefone_cliente: z.string().min(10, 'Telefone inválido'),
  email_cliente: z.string().email('E-mail inválido'),
  cpf_cnpj: z.string().optional(),
  produto_desejado: z.string().min(1, 'Selecione um produto'),
  quantidade: z.string(),
  tamanhos: z.string().optional(),
  cores: z.string().optional(),
  detalhes: z.string().optional(),
  observacoes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Animação de etapa ────────────────────────────────────────────────────────
const stepAnim = (dir: number) => ({
  initial: { opacity: 0, x: dir * 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: dir * -40 },
  transition: { duration: 0.25, ease: 'easeInOut' as const },
});

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FormularioOrcamento() {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1); // 1=avança, -1=volta

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [catSelecionada, setCatSelecionada] = useState<Categoria | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [atributoValues, setAtributoValues] = useState<Record<number, string>>({});
  const [atributoErrors, setAtributoErrors] = useState<Record<number, string>>({});
  const [quantidade, setQuantidade] = useState(10);
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [estado, setEstado] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultado, setResultado] = useState<{ numero: number; linkWhatsApp: string } | null>(null);

  const { register, handleSubmit, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { quantidade: '10' },
  });

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data.categorias)).catch(() => {});
  }, []);

  // Busca produtos quando uma categoria é selecionada
  useEffect(() => {
    setProdutoSelecionado(null);
    setAtributos([]);
    setAtributoValues({});
    setAtributoErrors({});
    if (catSelecionada) {
      api.get(`/produtos?categoria=${catSelecionada.id}`)
        .then(r => setProdutos(r.data.produtos))
        .catch(() => setProdutos([]));
    } else {
      setProdutos([]);
    }
  }, [catSelecionada]);

  // Busca atributos quando um produto é selecionado
  useEffect(() => {
    setAtributoValues({});
    setAtributoErrors({});
    if (produtoSelecionado) {
      api.get(`/produtos/${produtoSelecionado.id}/atributos`)
        .then(r => setAtributos(r.data.atributos))
        .catch(() => setAtributos([]));
    } else {
      setAtributos([]);
    }
  }, [produtoSelecionado]);

  const selecionarCategoria = (cat: Categoria | null) => {
    setCatSelecionada(cat);
    setValue('produto_desejado', cat ? cat.nome : 'Outros (especificar nos detalhes)');
  };

  const selecionarProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setValue('produto_desejado', produto.nome);
  };

  const avancar = async () => {
    if (step === 1) {
      const valido = await trigger('produto_desejado');
      const errosAtrib: Record<number, string> = {};
      atributos.forEach(a => {
        if (a.obrigatorio && !atributoValues[a.id]) errosAtrib[a.id] = 'Obrigatório';
      });
      if (Object.keys(errosAtrib).length) { setAtributoErrors(errosAtrib); return; }
      if (!valido) return;
    }
    setValue('quantidade', String(quantidade));
    setDir(1);
    setStep(s => s + 1);
  };

  const voltar = () => { setDir(-1); setStep(s => s - 1); };

  const onSubmit = async (data: FormData) => {
    setEstado('loading');
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v) formData.append(k, v as string); });
      if (imagemFile) formData.append('imagem_referencia', imagemFile);

      const atributosData = atributos
        .filter(a => atributoValues[a.id])
        .map(a => ({ atributo_id: a.id, opcao_id: parseInt(atributoValues[a.id]) }));
      if (atributosData.length) formData.append('atributos', JSON.stringify(atributosData));

      const res = await api.post('/orcamentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const orc = res.data.orcamento;
      const atributosTexto = atributos
        .filter(a => atributoValues[a.id])
        .map(a => `${a.nome}: ${a.opcoes.find(o => o.id === parseInt(atributoValues[a.id]))?.valor ?? ''}`)
        .join('\n');

      const link = gerarLinkWhatsApp({
        numero: orc.numero,
        nomeCliente: data.nome_cliente,
        telefoneCliente: data.telefone_cliente,
        emailCliente: data.email_cliente,
        cpfCnpj: data.cpf_cnpj,
        produtoDesejado: data.produto_desejado,
        quantidade: parseInt(data.quantidade),
        tamanhos: data.tamanhos,
        cores: data.cores,
        detalhes: [atributosTexto, data.detalhes].filter(Boolean).join('\n\n') || undefined,
        observacoes: data.observacoes,
      });

      setResultado({ numero: orc.numero, linkWhatsApp: link });
      setEstado('success');
      window.open(link, '_blank');
    } catch { setEstado('error'); }
  };

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (estado === 'success' && resultado) {
    return (
      <section id="orcamento" className="py-10 sm:py-12 lg:py-16" style={{ background: '#F8F9FA' }}>
        <div className="max-w-xl mx-auto px-4 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(0,94,213,0.1)' }}>
              <CheckCircle size={40} style={{ color: '#005ED5' }} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">Orçamento Enviado!</h2>
            <p className="text-gray-600 mb-2">Seu orçamento foi registrado com o número:</p>
            <div className="inline-block text-4xl font-black mb-6 px-6 py-3 rounded-2xl"
              style={{ color: '#005ED5', background: 'rgba(0,94,213,0.1)' }}>
              #{resultado.numero}
            </div>
            <p className="text-gray-600 mb-8">
              Guarde este número para acompanhar sua produção. Finalize pelo WhatsApp:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={resultado.linkWhatsApp} target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 rounded-full font-bold text-white transition-all hover:scale-105"
                style={{ background: '#25D366' }}>
                💬 Confirmar pelo WhatsApp
              </a>
              <button type="button"
                onClick={() => { setEstado('idle'); setResultado(null); setStep(1); setCatSelecionada(null); setProdutoSelecionado(null); }}
                className="px-6 py-3 rounded-full font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
                Novo Orçamento
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <section id="orcamento" className="py-10 sm:py-12 lg:py-16" style={{ background: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10 sm:mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(255,148,0,0.1)', color: '#FF9400' }}>
            Orçamento Grátis
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Solicite seu <span style={{ color: '#005ED5' }}>orçamento</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Preencha em 3 passos rápidos e receba nossa resposta em até 24h.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            {/* ── Indicador de progresso ── */}
            <StepIndicator step={step} />

            {/* ── Conteúdo da etapa ── */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4 min-h-[340px]">
                {estado === 'error' && (
                  <div className="flex items-center gap-3 p-3 rounded-xl mb-4 bg-red-50 border border-red-100">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-red-700 text-sm">Erro ao enviar. Tente novamente.</p>
                  </div>
                )}

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={step} {...stepAnim(dir)}>
                    {step === 1 && (
                      <Etapa1
                        categorias={categorias}
                        catSelecionada={catSelecionada}
                        onSelectCat={selecionarCategoria}
                        produtos={produtos}
                        produtoSelecionado={produtoSelecionado}
                        onSelectProduto={selecionarProduto}
                        atributos={atributos}
                        atributoValues={atributoValues}
                        setAtributoValues={setAtributoValues}
                        atributoErrors={atributoErrors}
                        setAtributoErrors={setAtributoErrors}
                        erroProduto={errors.produto_desejado?.message}
                        register={register}
                      />
                    )}
                    {step === 2 && (
                      <Etapa2
                        quantidade={quantidade}
                        setQuantidade={setQuantidade}
                        register={register}
                        imagemFile={imagemFile}
                        setImagemFile={setImagemFile}
                      />
                    )}
                    {step === 3 && (
                      <Etapa3
                        register={register}
                        errors={errors}
                        catSelecionada={catSelecionada}
                        produtoSelecionado={produtoSelecionado}
                        atributos={atributos}
                        atributoValues={atributoValues}
                        quantidade={quantidade}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ── Navegação ── */}
              <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center gap-3">
                {step > 1 && (
                  <button type="button" onClick={voltar}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all">
                    <ChevronLeft size={16} /> Voltar
                  </button>
                )}
                <div className="flex-1" />
                {step < 3 ? (
                  <button type="button" onClick={avancar}
                    className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-all hover:scale-105 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #005ED5, #0047A8)' }}>
                    Próximo <ChevronRight size={16} />
                  </button>
                ) : (
                  <button type="submit" disabled={estado === 'loading'}
                    className="flex items-center gap-2 px-7 py-3 rounded-full font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}>
                    {estado === 'loading'
                      ? <><Loader2 size={18} className="animate-spin" /> Enviando...</>
                      : <><Send size={16} /> Enviar Orçamento</>}
                  </button>
                )}
              </div>
            </form>
          </div>

          <p className="text-xs text-center text-gray-400 mt-4">
            Ao enviar, você concorda com nosso uso dos dados para fins de atendimento comercial.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Indicador de passos ──────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const labels = ['Produto', 'Detalhes', 'Seus Dados'];
  return (
    <div className="px-6 sm:px-8 pt-7 pb-5">
      <div className="flex items-center gap-0">
        {labels.map((label, i) => {
          const n = i + 1;
          const ativo = step === n;
          const feito = step > n;
          return (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                  style={{
                    background: feito ? '#22C55E' : ativo ? '#005ED5' : '#E5E7EB',
                    color: feito || ativo ? '#fff' : '#9CA3AF',
                  }}
                >
                  {feito ? <CheckCircle size={16} /> : n}
                </div>
                <span className="text-[11px] font-medium whitespace-nowrap"
                  style={{ color: ativo ? '#005ED5' : feito ? '#22C55E' : '#9CA3AF' }}>
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500"
                  style={{ background: feito ? '#22C55E' : '#E5E7EB' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Etapa 1: Produto ─────────────────────────────────────────────────────────
function Etapa1({ categorias, catSelecionada, onSelectCat, produtos, produtoSelecionado, onSelectProduto,
  atributos, atributoValues, setAtributoValues, atributoErrors, setAtributoErrors, erroProduto, register }:
{
  categorias: Categoria[];
  catSelecionada: Categoria | null;
  onSelectCat: (c: Categoria | null) => void;
  produtos: Produto[];
  produtoSelecionado: Produto | null;
  onSelectProduto: (p: Produto) => void;
  atributos: Atributo[];
  atributoValues: Record<number, string>;
  setAtributoValues: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  atributoErrors: Record<number, string>;
  setAtributoErrors: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  erroProduto?: string;
  register: ReturnType<typeof useForm<FormData>>['register'];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-1">Etapa 1 de 3</p>
      <h3 className="text-xl font-black text-gray-900 mb-5">Qual produto você precisa?</h3>

      {/* Cards de categoria */}
      <input type="hidden" {...register('produto_desejado')} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {categorias.map(cat => {
          const Icon = ICONE_CATEGORIA[cat.slug] ?? Package;
          const ativo = catSelecionada?.id === cat.id;
          return (
            <button key={cat.id} type="button" onClick={() => onSelectCat(cat)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:shadow-md"
              style={{
                borderColor: ativo ? '#005ED5' : '#E5E7EB',
                background: ativo ? 'rgba(0,94,213,0.06)' : '#fff',
              }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: ativo ? 'rgba(0,94,213,0.12)' : '#F3F4F6' }}>
                <Icon size={22} style={{ color: ativo ? '#005ED5' : '#6B7280' }} />
              </div>
              <span className="text-sm font-semibold"
                style={{ color: ativo ? '#005ED5' : '#374151' }}>
                {cat.nome}
              </span>
            </button>
          );
        })}

        {/* Card "Outros" */}
        <button type="button" onClick={() => onSelectCat(null)}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:shadow-md"
          style={{ borderColor: '#E5E7EB', background: '#fff' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
            <Plus size={22} style={{ color: '#6B7280' }} />
          </div>
          <span className="text-sm font-semibold text-gray-600">Outros</span>
        </button>
      </div>

      {erroProduto && <p className="text-xs text-red-500 mb-4">{erroProduto}</p>}

      {/* Seleção de produto dentro da categoria */}
      <AnimatePresence>
        {catSelecionada && produtos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}
            className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">Qual modelo?</p>
            <div className="flex flex-wrap gap-2">
              {produtos.map(produto => {
                const sel = produtoSelecionado?.id === produto.id;
                return (
                  <button key={produto.id} type="button" onClick={() => onSelectProduto(produto)}
                    className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-150"
                    style={{
                      borderColor: sel ? '#005ED5' : '#E5E7EB',
                      background: sel ? '#005ED5' : '#fff',
                      color: sel ? '#fff' : '#374151',
                    }}>
                    {produto.nome}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Atributos dinâmicos */}
      <AnimatePresence>
        {atributos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}
            className="space-y-4 border-t border-gray-100 pt-4">
            {atributos.map(atributo => (
              <div key={atributo.id}>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {atributo.nome}
                  {atributo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {atributo.opcoes.map(opcao => {
                    const sel = atributoValues[atributo.id] === String(opcao.id);
                    return (
                      <button key={opcao.id} type="button"
                        onClick={() => {
                          setAtributoValues(p => ({ ...p, [atributo.id]: String(opcao.id) }));
                          setAtributoErrors(p => { const n = { ...p }; delete n[atributo.id]; return n; });
                        }}
                        className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-150"
                        style={{
                          borderColor: sel ? '#005ED5' : '#E5E7EB',
                          background: sel ? '#005ED5' : '#fff',
                          color: sel ? '#fff' : '#374151',
                        }}>
                        {opcao.valor}
                      </button>
                    );
                  })}
                </div>
                {atributoErrors[atributo.id] && (
                  <p className="mt-1 text-xs text-red-500">{atributoErrors[atributo.id]}</p>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Etapa 2: Detalhes ────────────────────────────────────────────────────────
function Etapa2({ quantidade, setQuantidade, register, imagemFile, setImagemFile }:
{
  quantidade: number;
  setQuantidade: React.Dispatch<React.SetStateAction<number>>;
  register: ReturnType<typeof useForm<FormData>>['register'];
  imagemFile: File | null;
  setImagemFile: React.Dispatch<React.SetStateAction<File | null>>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-1">Etapa 2 de 3</p>
        <h3 className="text-xl font-black text-gray-900 mb-5">Quantidade e personalização</h3>
      </div>

      {/* Contador de quantidade */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Quantidade de peças</p>
        <div className="flex items-center gap-4">
          <button type="button"
            onClick={() => setQuantidade(q => Math.max(1, q - 1))}
            className="w-11 h-11 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all">
            <Minus size={18} className="text-gray-600" />
          </button>
          <input
            type="number"
            value={quantidade}
            min={1}
            onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 text-center text-2xl font-black text-gray-900 border-b-2 border-blue-400 outline-none bg-transparent"
          />
          <button type="button"
            onClick={() => setQuantidade(q => q + 1)}
            className="w-11 h-11 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-all">
            <Plus size={18} className="text-gray-600" />
          </button>
          <span className="text-sm text-gray-500">peças</span>
        </div>
      </div>

      {/* Tamanhos + Cores */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tamanhos</label>
          <input {...register('tamanhos')}
            placeholder="Ex: 10 P, 20 M, 20 G"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cores desejadas</label>
          <input {...register('cores')}
            placeholder="Ex: Azul marinho, branco"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors" />
        </div>
      </div>

      {/* Detalhes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Detalhes de personalização <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea {...register('detalhes')} rows={2}
          placeholder="Bordado, estampa, logo, posicionamento..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors resize-none" />
      </div>

      {/* Upload */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Imagem de referência <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <button type="button"
          onClick={() => document.getElementById('img-upload')?.click()}
          className="w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 hover:border-blue-400 transition-colors"
          style={{ borderColor: imagemFile ? '#005ED5' : '#D1D5DB' }}>
          <Upload size={20} style={{ color: imagemFile ? '#005ED5' : '#9CA3AF' }} />
          {imagemFile
            ? <span className="text-sm font-medium" style={{ color: '#005ED5' }}>{imagemFile.name}</span>
            : <span className="text-sm text-gray-500">Toque para enviar — PNG, JPG, WebP (máx. 5MB)</span>}
        </button>
        <input id="img-upload" type="file" accept="image/*" className="hidden"
          onChange={e => setImagemFile(e.target.files?.[0] ?? null)} />
      </div>
    </div>
  );
}

// ─── Etapa 3: Dados do cliente ────────────────────────────────────────────────
function Etapa3({ register, errors, catSelecionada, produtoSelecionado, atributos, atributoValues, quantidade }:
{
  register: ReturnType<typeof useForm<FormData>>['register'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
  catSelecionada: Categoria | null;
  produtoSelecionado: Produto | null;
  atributos: Atributo[];
  atributoValues: Record<number, string>;
  quantidade: number;
}) {
  const atributosTexto = atributos
    .filter(a => atributoValues[a.id])
    .map(a => `${a.nome}: ${a.opcoes.find(o => o.id === parseInt(atributoValues[a.id]))?.valor ?? ''}`)
    .join(' · ');

  const nomeProduto = produtoSelecionado?.nome ?? catSelecionada?.nome ?? 'Outros';

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-1">Etapa 3 de 3</p>
        <h3 className="text-xl font-black text-gray-900 mb-4">Seus dados para contato</h3>
      </div>

      {/* Resumo do pedido */}
      {(catSelecionada || produtoSelecionado || atributosTexto) && (
        <div className="flex items-start gap-3 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(0,94,213,0.05)', border: '1px solid rgba(0,94,213,0.12)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(0,94,213,0.1)' }}>
            {(() => { const I = ICONE_CATEGORIA[catSelecionada?.slug ?? ''] ?? Package; return <I size={14} style={{ color: '#005ED5' }} />; })()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {nomeProduto} — {quantidade} peças
            </p>
            {atributosTexto && <p className="text-gray-500 text-xs mt-0.5">{atributosTexto}</p>}
          </div>
        </div>
      )}

      {/* Campos de dados */}
      <div className="grid sm:grid-cols-2 gap-4">
        <InputField label="Nome completo *" error={errors.nome_cliente?.message}>
          <input {...register('nome_cliente')} placeholder="Seu nome" />
        </InputField>
        <InputField label="Telefone / WhatsApp *" error={errors.telefone_cliente?.message}>
          <input {...register('telefone_cliente')} placeholder="(17) 99999-9999" />
        </InputField>
        <InputField label="E-mail *" error={errors.email_cliente?.message}>
          <input {...register('email_cliente')} type="email" placeholder="seu@email.com" />
        </InputField>
        <InputField label="CPF / CNPJ">
          <input {...register('cpf_cnpj')} placeholder="Opcional" />
        </InputField>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Observações <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea {...register('observacoes')} rows={2}
          placeholder="Informações adicionais..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors resize-none" />
      </div>
    </div>
  );
}

// ─── Input genérico ───────────────────────────────────────────────────────────
function InputField({ label, error, children }: { label: string; error?: string; children: React.ReactElement }) {
  const cls = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors focus:ring-2 ${
    error ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-blue-50'
  }`;
  const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {child.type === 'select'
        ? <select {...(child.props as React.SelectHTMLAttributes<HTMLSelectElement>)} className={cls} />
        : <input {...(child.props as React.InputHTMLAttributes<HTMLInputElement>)} className={cls} />}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
