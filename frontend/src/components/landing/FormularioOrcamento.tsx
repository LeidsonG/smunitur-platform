'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shirt, Wind, FlaskConical, Package,
  Plus, Upload, Send, Loader2, X,
  CheckCircle, Check, AlertCircle, ChevronRight, ChevronLeft,
} from 'lucide-react';
import api, { API_BASE } from '@/lib/api';
import { gerarLinkWhatsApp } from '@/lib/whatsapp';
import Reveal from './Reveal';

const TAMANHOS_PADRAO = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Categoria { id: number; nome: string; slug: string }
interface Produto { id: number; nome: string; descricao?: string }
interface Opcao { id: number; valor: string; imagem?: string | null }
interface Atributo { id: number; nome: string; obrigatorio: boolean; opcoes: Opcao[] }

const ICONE_CATEGORIA: Record<string, React.ElementType> = {
  camisetas: Shirt,
  moletons: Wind,
  jalecos: FlaskConical,
};

const schema = z.object({
  nome_cliente: z.string().min(2, 'Informe seu nome'),
  telefone_cliente: z.string().min(10, 'Telefone incompleto'),
  // Empty string passes `.email()` falsely as "invalid". Splitting the rule
  // gives a clearer message for the empty case and avoids "E-mail inválido"
  // when the user has not typed anything yet.
  email_cliente: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
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
  const [quantidade, setQuantidade] = useState(0);
  const [imagemFiles, setImagemFiles] = useState<File[]>([]);
  const [estado, setEstado] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultado, setResultado] = useState<{ numero: number; linkWhatsApp: string } | null>(null);

  const { register, handleSubmit, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome_cliente: '',
      telefone_cliente: '',
      email_cliente: '',
      cpf_cnpj: '',
      produto_desejado: '',
      quantidade: '0',
      tamanhos: '',
      cores: '',
      detalhes: '',
      observacoes: '',
    },
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
      imagemFiles.forEach(f => formData.append('imagem_referencia', f));

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
        cpfCnpj: data.cpf_cnpj || undefined,
        categoria: catSelecionada?.nome,
        produtoDesejado: produtoSelecionado?.nome ?? data.produto_desejado,
        quantidade: parseInt(data.quantidade),
        tamanhos: data.tamanhos || undefined,
        cores: data.cores || undefined,
        especificacoes: atributosTexto || undefined,
        detalhes: data.detalhes || undefined,
        observacoes: data.observacoes || undefined,
      });

      setResultado({ numero: orc.numero, linkWhatsApp: link });
      setEstado('success');
      window.open(link, '_blank');
    } catch { setEstado('error'); }
  };

  // ── Tela de sucesso ──────────────────────────────────────────────────────────
  if (estado === 'success' && resultado) {
    return (
      <section id="orcamento" className="py-16 sm:py-20 lg:py-28" style={{ background: '#F8F9FA' }}>
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
                onClick={() => { setEstado('idle'); setResultado(null); setStep(1); setCatSelecionada(null); setProdutoSelecionado(null); setImagemFiles([]); }}
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
    <section id="orcamento" className="py-16 sm:py-20 lg:py-28" style={{ background: '#F8F9FA' }}>
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
                        setQuantidade={setQuantidade}
                        register={register}
                        setValue={setValue}
                        imagemFiles={imagemFiles}
                        setImagemFiles={setImagemFiles}
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
                {atributo.opcoes.some(o => o.imagem) ? (
                  <div className="flex flex-wrap gap-2">
                    {atributo.opcoes.map(opcao => {
                      const sel = atributoValues[atributo.id] === String(opcao.id);
                      return (
                        <button key={opcao.id} type="button"
                          onClick={() => {
                            setAtributoValues(p => ({ ...p, [atributo.id]: String(opcao.id) }));
                            setAtributoErrors(p => { const n = { ...p }; delete n[atributo.id]; return n; });
                          }}
                          className="relative flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-150 hover:shadow-md"
                          style={{
                            width: 80,
                            borderColor: sel ? '#005ED5' : '#E5E7EB',
                          }}>
                          <div className="w-full h-16 bg-white flex items-center justify-center">
                            {opcao.imagem
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={`${API_BASE}${opcao.imagem}`} alt={opcao.valor} className="w-full h-full object-contain p-1" />
                              : <span className="text-gray-300 text-xs">—</span>}
                          </div>
                          {sel && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ background: '#005ED5' }}>
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                          <div className="w-full px-1 py-1.5 border-t border-gray-100 text-center"
                            style={{ background: sel ? 'rgba(0,94,213,0.07)' : '#F9FAFB' }}>
                            <span className="text-xs font-semibold truncate block"
                              style={{ color: sel ? '#005ED5' : '#374151' }}>
                              {opcao.valor}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
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
                )}
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
// Limite por imagem em bytes. Deve ESTAR ALINHADO com `MAX_FILE_SIZE` do
// backend (backend/.env) — caso contrário o servidor rejeitará uploads que
// o frontend deixou passar.
const MAX_IMG = 10 * 1024 * 1024; // 10 MB

function Etapa2({ setQuantidade, register, setValue, imagemFiles, setImagemFiles }:
{
  setQuantidade: React.Dispatch<React.SetStateAction<number>>;
  register: ReturnType<typeof useForm<FormData>>['register'];
  setValue: ReturnType<typeof useForm<FormData>>['setValue'];
  imagemFiles: File[];
  setImagemFiles: React.Dispatch<React.SetStateAction<File[]>>;
}) {
  const [tamQtd, setTamQtd] = useState<Record<string, number>>({});
  const [tamEspecialAberto, setTamEspecialAberto] = useState(false);
  const [tamEspecialNome, setTamEspecialNome] = useState('');
  const [tamEspecialQtd, setTamEspecialQtd] = useState<number>(0);
  const [tamLivre, setTamLivre] = useState('');
  const [imgErro, setImgErro] = useState('');

  const totalTam = TAMANHOS_PADRAO.reduce((s, t) => s + (tamQtd[t] ?? 0), 0) + (tamEspecialQtd || 0);

  // Sincroniza tamanhos e quantidade com o form
  useEffect(() => {
    const partes: string[] = [];
    TAMANHOS_PADRAO.forEach(t => {
      const q = tamQtd[t] ?? 0;
      if (q > 0) partes.push(`${t}: ${q}`);
    });
    if (tamEspecialNome.trim()) {
      partes.push(tamEspecialQtd > 0
        ? `${tamEspecialNome.trim()}: ${tamEspecialQtd}`
        : tamEspecialNome.trim());
    }
    if (tamLivre.trim()) partes.push(tamLivre.trim());
    setValue('tamanhos', partes.join(', ') || '');

    const total = TAMANHOS_PADRAO.reduce((s, t) => s + (tamQtd[t] ?? 0), 0) + (tamEspecialQtd || 0);
    if (total > 0) {
      setQuantidade(total);
      setValue('quantidade', String(total));
    }
  }, [tamQtd, tamEspecialNome, tamEspecialQtd, tamLivre, setValue, setQuantidade]);

  const adicionarImagens = (files: FileList | null) => {
    if (!files) return;
    const validas: File[] = [];
    let erro = '';
    Array.from(files).forEach(f => {
      if (f.size > MAX_IMG) { erro = `"${f.name}" excede 10 MB e foi ignorado.`; }
      else validas.push(f);
    });
    setImgErro(erro);
    setImagemFiles(prev => [...prev, ...validas]);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-1">Etapa 2 de 3</p>
        <h3 className="text-xl font-black text-gray-900 mb-5">Quantidade e personalização</h3>
      </div>

      {/* Total calculado */}
      {totalTam > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(0,94,213,0.06)', border: '1px solid rgba(0,94,213,0.12)' }}>
          <span className="text-2xl font-black" style={{ color: '#005ED5' }}>{totalTam}</span>
          <span className="text-sm text-gray-500">peças no total</span>
        </div>
      )}

      {/* Tamanhos */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          Tamanhos <span className="font-normal text-gray-400 text-xs">— clique para selecionar</span>
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {TAMANHOS_PADRAO.map(tam => {
            const qtd = tamQtd[tam] ?? 0;
            const ativo = qtd > 0;
            return ativo ? (
              <div key={tam}
                className="flex items-center rounded-xl border-2 overflow-hidden transition-all duration-150"
                style={{ borderColor: '#005ED5' }}>
                <button type="button"
                  onClick={() => setTamQtd(p => ({ ...p, [tam]: 0 }))}
                  className="px-3 py-2 text-sm font-bold text-white"
                  style={{ background: '#005ED5' }}
                  title="Clique para remover">
                  {tam}
                </button>
                <input
                  type="number" min={1} value={qtd}
                  onChange={e => setTamQtd(p => ({ ...p, [tam]: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="w-12 text-center text-sm font-bold outline-none py-2 border-l-2"
                  style={{ background: 'rgba(0,94,213,0.07)', color: '#005ED5', borderColor: 'rgba(0,94,213,0.25)' }}
                />
              </div>
            ) : (
              <button key={tam} type="button"
                onClick={() => setTamQtd(p => ({ ...p, [tam]: 1 }))}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-400 bg-gray-50 hover:border-blue-300 hover:text-blue-500 transition-all duration-150">
                {tam}
              </button>
            );
          })}
        </div>

        {/* Tamanho especial — colapsável */}
        <div className="mt-3">
          <button type="button"
            onClick={() => {
              setTamEspecialAberto(v => !v);
              if (tamEspecialAberto) { setTamEspecialNome(''); setTamEspecialQtd(0); setTamLivre(''); }
            }}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-blue-500 transition-colors">
            <Plus size={13} className={`transition-transform duration-200 ${tamEspecialAberto ? 'rotate-45' : ''}`} />
            {tamEspecialAberto ? 'Fechar tamanho especial' : 'Adicionar tamanho especial'}
          </button>

          {tamEspecialAberto && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-colors"
                style={{ borderColor: tamEspecialNome.trim() ? '#005ED5' : '#E5E7EB', background: tamEspecialNome.trim() ? 'rgba(0,94,213,0.04)' : '#fff' }}>
                <input type="text" placeholder="Ex: 42, 44, Único, Infantil..."
                  value={tamEspecialNome}
                  onChange={e => setTamEspecialNome(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent font-medium placeholder-gray-400"
                  style={{ color: tamEspecialNome.trim() ? '#005ED5' : undefined }}
                  autoFocus />
                {tamEspecialNome.trim() && (
                  <>
                    <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                    <input type="number" min={1} placeholder="Qtd"
                      value={tamEspecialQtd || ''}
                      onChange={e => setTamEspecialQtd(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 text-center text-sm font-bold outline-none bg-transparent flex-shrink-0"
                      style={{ color: '#005ED5' }} />
                  </>
                )}
              </div>
              <textarea
                placeholder="Outras especificações de tamanho..."
                value={tamLivre}
                onChange={e => setTamLivre(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Cores */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cores desejadas</label>
        <input {...register('cores')} placeholder="Ex: Azul marinho, branco"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors" />
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

      {/* Upload múltiplo */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Imagens de referência <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <button type="button"
          onClick={() => document.getElementById('img-upload')?.click()}
          className="w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 hover:border-blue-400 transition-colors mb-2"
          style={{ borderColor: imagemFiles.length > 0 ? '#005ED5' : '#D1D5DB' }}>
          <Upload size={20} style={{ color: imagemFiles.length > 0 ? '#005ED5' : '#9CA3AF' }} />
          <span className="text-sm" style={{ color: imagemFiles.length > 0 ? '#005ED5' : '#6B7280' }}>
            {imagemFiles.length > 0
              ? `${imagemFiles.length} imagem${imagemFiles.length > 1 ? 'ns' : ''} selecionada${imagemFiles.length > 1 ? 's' : ''} — toque para adicionar mais`
              : 'Toque para enviar — PNG, JPG, WebP (máx. 10 MB por imagem)'}
          </span>
        </button>
        <input id="img-upload" type="file" accept="image/*" multiple className="hidden"
          onChange={e => { adicionarImagens(e.target.files); e.target.value = ''; }} />
        {imgErro && <p className="text-xs text-red-500 mb-1">{imgErro}</p>}
        {imagemFiles.length > 0 && (
          <ul className="space-y-1">
            {imagemFiles.map((f, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600">
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-gray-400 flex-shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button type="button"
                  onClick={() => setImagemFiles(prev => prev.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
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
        <InputField label="Nome completo" error={errors.nome_cliente?.message}>
          <input {...register('nome_cliente')} placeholder="Seu nome" />
        </InputField>
        <InputField label="Telefone / WhatsApp" error={errors.telefone_cliente?.message}>
          <input {...register('telefone_cliente')} placeholder="(17) 99999-9999" />
        </InputField>
        <InputField label="E-mail" error={errors.email_cliente?.message}>
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
