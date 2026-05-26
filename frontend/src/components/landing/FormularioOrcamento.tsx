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
interface Linha { id: number; nome: string; slug: string }
interface Modelo { id: number; nome: string; descricao?: string }
interface Variacao { id: number; valor: string; imagem?: string | null }
interface Especificacao { id: number; nome: string; obrigatorio: boolean; variacoes: Variacao[] }

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
  modelo_desejado: z.string().min(1, 'Selecione um modelo'),
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

  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [catSelecionada, setCatSelecionada] = useState<Linha | null>(null);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<Modelo | null>(null);
  const [especificacoes, setEspecificações] = useState<Especificacao[]>([]);
  const [especificaçãoValues, setEspecificaçãoValues] = useState<Record<number, string>>({});
  const [especificaçãoErrors, setEspecificaçãoErrors] = useState<Record<number, string>>({});
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
      modelo_desejado: '',
      quantidade: '0',
      tamanhos: '',
      cores: '',
      detalhes: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    api.get('/linhas').then(r => setLinhas(r.data.linhas)).catch(() => {});
  }, []);

  // Busca modelos quando uma linha é selecionada
  useEffect(() => {
    setModeloSelecionado(null);
    setEspecificações([]);
    setEspecificaçãoValues({});
    setEspecificaçãoErrors({});
    if (catSelecionada) {
      api.get(`/modelos?linha=${catSelecionada.id}`)
        .then(r => setModelos(r.data.modelos))
        .catch(() => setModelos([]));
    } else {
      setModelos([]);
    }
  }, [catSelecionada]);

  // Busca especificacoes quando um modelo é selecionado
  useEffect(() => {
    setEspecificaçãoValues({});
    setEspecificaçãoErrors({});
    if (modeloSelecionado) {
      api.get(`/modelos/${modeloSelecionado.id}/especificacoes`)
        .then(r => setEspecificações(r.data.especificacoes))
        .catch(() => setEspecificações([]));
    } else {
      setEspecificações([]);
    }
  }, [modeloSelecionado]);

  const selecionarLinha = (cat: Linha | null) => {
    setCatSelecionada(cat);
    setValue('modelo_desejado', cat ? cat.nome : 'Outros (especificar nos detalhes)');
  };

  const selecionarModelo = (modelo: Modelo) => {
    setModeloSelecionado(modelo);
    setValue('modelo_desejado', modelo.nome);
  };

  const avancar = async () => {
    if (step === 1) {
      const valido = await trigger('modelo_desejado');
      const errosAtrib: Record<number, string> = {};
      especificacoes.forEach(a => {
        if (a.obrigatorio && !especificaçãoValues[a.id]) errosAtrib[a.id] = 'Obrigatório';
      });
      if (Object.keys(errosAtrib).length) { setEspecificaçãoErrors(errosAtrib); return; }
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

      const especificaçõesData = especificacoes
        .filter(a => especificaçãoValues[a.id])
        .map(a => ({ especificacao_id: a.id, variacao_id: parseInt(especificaçãoValues[a.id]) }));
      if (especificaçõesData.length) formData.append('especificacoes', JSON.stringify(especificaçõesData));

      const res = await api.post('/orcamentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const orc = res.data.orcamento;
      const especificaçõesTexto = especificacoes
        .filter(a => especificaçãoValues[a.id])
        .map(a => `${a.nome}: ${a.variacoes.find(o => o.id === parseInt(especificaçãoValues[a.id]))?.valor ?? ''}`)
        .join('\n');

      const link = gerarLinkWhatsApp({
        numero: orc.numero,
        nomeCliente: data.nome_cliente,
        telefoneCliente: data.telefone_cliente,
        emailCliente: data.email_cliente,
        cpfCnpj: data.cpf_cnpj || undefined,
        linha: catSelecionada?.nome,
        modeloDesejado: modeloSelecionado?.nome ?? data.modelo_desejado,
        quantidade: parseInt(data.quantidade),
        tamanhos: data.tamanhos || undefined,
        cores: data.cores || undefined,
        especificacoes: especificaçõesTexto || undefined,
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
                onClick={() => { setEstado('idle'); setResultado(null); setStep(1); setCatSelecionada(null); setModeloSelecionado(null); setImagemFiles([]); }}
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
                        linhas={linhas}
                        catSelecionada={catSelecionada}
                        onSelectCat={selecionarLinha}
                        modelos={modelos}
                        modeloSelecionado={modeloSelecionado}
                        onSelectModelo={selecionarModelo}
                        especificacoes={especificacoes}
                        especificaçãoValues={especificaçãoValues}
                        setEspecificaçãoValues={setEspecificaçãoValues}
                        especificaçãoErrors={especificaçãoErrors}
                        setEspecificaçãoErrors={setEspecificaçãoErrors}
                        erroModelo={errors.modelo_desejado?.message}
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
                        modeloSelecionado={modeloSelecionado}
                        especificacoes={especificacoes}
                        especificaçãoValues={especificaçãoValues}
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
  const labels = ['Modelo', 'Detalhes', 'Seus Dados'];
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

// ─── Etapa 1: Modelo ─────────────────────────────────────────────────────────
function Etapa1({ linhas, catSelecionada, onSelectCat, modelos, modeloSelecionado, onSelectModelo,
  especificacoes, especificaçãoValues, setEspecificaçãoValues, especificaçãoErrors, setEspecificaçãoErrors, erroModelo, register }:
{
  linhas: Linha[];
  catSelecionada: Linha | null;
  onSelectCat: (c: Linha | null) => void;
  modelos: Modelo[];
  modeloSelecionado: Modelo | null;
  onSelectModelo: (p: Modelo) => void;
  especificacoes: Especificacao[];
  especificaçãoValues: Record<number, string>;
  setEspecificaçãoValues: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  especificaçãoErrors: Record<number, string>;
  setEspecificaçãoErrors: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  erroModelo?: string;
  register: ReturnType<typeof useForm<FormData>>['register'];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500 mb-1">Etapa 1 de 3</p>
      <h3 className="text-xl font-black text-gray-900 mb-5">Qual modelo você precisa?</h3>

      {/* Cards de linha */}
      <input type="hidden" {...register('modelo_desejado')} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {linhas.map(cat => {
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

      {erroModelo && <p className="text-xs text-red-500 mb-4">{erroModelo}</p>}

      {/* Seleção de modelo dentro da linha.
          Render direto (sem AnimatePresence aninhada) — o framer-motion
          externo da etapa já cuida da transição entre etapas; mais uma
          camada de animação aqui causava cliques perdidos durante o
          fade-in dos botões. */}
      {catSelecionada && modelos.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mb-4">
          <p className="text-sm font-semibold text-gray-600 mb-2">Qual modelo?</p>
          <div className="flex flex-wrap gap-2">
            {modelos.map(modelo => {
              const sel = modeloSelecionado?.id === modelo.id;
              return (
                <button key={modelo.id} type="button" onClick={() => onSelectModelo(modelo)}
                  className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-150"
                  style={{
                    borderColor: sel ? '#005ED5' : '#E5E7EB',
                    background: sel ? '#005ED5' : '#fff',
                    color: sel ? '#fff' : '#374151',
                  }}>
                  {modelo.nome}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Especificações do modelo. Render direto pelo mesmo motivo acima:
          AnimatePresence interna estava interceptando os primeiros cliques
          enquanto a animação de entrada terminava. */}
      {especificacoes.length > 0 && (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          {especificacoes.map(especificacao => (
            <div key={especificacao.id}>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {especificacao.nome}
                {especificacao.obrigatorio && <span className="text-red-500 ml-1">*</span>}
              </p>
              {especificacao.variacoes.some(o => o.imagem) ? (
                <div className="flex flex-wrap gap-2">
                  {especificacao.variacoes.map(variacao => {
                    const sel = especificaçãoValues[especificacao.id] === String(variacao.id);
                    return (
                      <button key={variacao.id} type="button"
                        onClick={() => {
                          setEspecificaçãoValues(p => ({ ...p, [especificacao.id]: String(variacao.id) }));
                          setEspecificaçãoErrors(p => { const n = { ...p }; delete n[especificacao.id]; return n; });
                        }}
                        className="relative flex flex-col rounded-xl border-2 overflow-hidden transition-all duration-150 hover:shadow-md"
                        style={{
                          width: 80,
                          borderColor: sel ? '#005ED5' : '#E5E7EB',
                        }}>
                        <div className="w-full h-16 bg-white flex items-center justify-center">
                          {variacao.imagem
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={`${API_BASE}${variacao.imagem}`} alt={variacao.valor} className="w-full h-full object-contain p-1" />
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
                            {variacao.valor}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {especificacao.variacoes.map(variacao => {
                    const sel = especificaçãoValues[especificacao.id] === String(variacao.id);
                    return (
                      <button key={variacao.id} type="button"
                        onClick={() => {
                          setEspecificaçãoValues(p => ({ ...p, [especificacao.id]: String(variacao.id) }));
                          setEspecificaçãoErrors(p => { const n = { ...p }; delete n[especificacao.id]; return n; });
                        }}
                        className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-150"
                        style={{
                          borderColor: sel ? '#005ED5' : '#E5E7EB',
                          background: sel ? '#005ED5' : '#fff',
                          color: sel ? '#fff' : '#374151',
                        }}>
                        {variacao.valor}
                      </button>
                    );
                  })}
                </div>
              )}
              {especificaçãoErrors[especificacao.id] && (
                <p className="mt-1 text-xs text-red-500">{especificaçãoErrors[especificacao.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}
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
  // tamQtd guarda a quantidade por tamanho. Um tamanho está "selecionado"
  // quando existe como chave (mesmo com qtd 0 enquanto o usuário digita).
  const [tamQtd, setTamQtd] = useState<Record<string, number>>({});
  const [imgErro, setImgErro] = useState('');

  const tamanhosSelecionados = TAMANHOS_PADRAO.filter(t => tamQtd[t] !== undefined);
  const totalTam = tamanhosSelecionados.reduce((s, t) => s + (tamQtd[t] || 0), 0);

  const toggleTamanho = (tam: string) => {
    setTamQtd(p => {
      if (p[tam] !== undefined) {
        // Estava selecionado → remove
        const novo = { ...p };
        delete novo[tam];
        return novo;
      }
      // Não estava → inclui com qtd inicial 1
      return { ...p, [tam]: 1 };
    });
  };

  const ajustarQtd = (tam: string, delta: number) => {
    setTamQtd(p => ({ ...p, [tam]: Math.max(1, (p[tam] || 0) + delta) }));
  };

  // Sincroniza tamanhos e quantidade total com o form sempre que muda.
  useEffect(() => {
    const partes: string[] = [];
    TAMANHOS_PADRAO.forEach(t => {
      const q = tamQtd[t];
      if (q !== undefined && q > 0) partes.push(`${t}: ${q}`);
    });
    setValue('tamanhos', partes.join(', ') || '');
    setQuantidade(totalTam);
    setValue('quantidade', String(totalTam));
  }, [tamQtd, totalTam, setValue, setQuantidade]);

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

      {/* Tamanhos: passo 1 = seleção, passo 2 = quantidade */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">
          Quais tamanhos você precisa?
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Toque para escolher — o campo de quantidade aparece em seguida.
        </p>
        <div className="flex flex-wrap gap-2">
          {TAMANHOS_PADRAO.map(tam => {
            const ativo = tamQtd[tam] !== undefined;
            return (
              <button
                key={tam}
                type="button"
                onClick={() => toggleTamanho(tam)}
                aria-pressed={ativo}
                className="px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all duration-150"
                style={{
                  borderColor: ativo ? '#005ED5' : '#E5E7EB',
                  background: ativo ? '#005ED5' : '#fff',
                  color: ativo ? '#fff' : '#9CA3AF',
                }}
              >
                {tam}
              </button>
            );
          })}
        </div>

        {/* Lista de quantidade — só aparece para os selecionados */}
        {tamanhosSelecionados.length > 0 && (
          <div className="mt-4 space-y-2 rounded-2xl border border-gray-100 bg-gray-50/50 p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1">
              Quantidade por tamanho
            </p>
            {tamanhosSelecionados.map(tam => {
              const qtd = tamQtd[tam] ?? 0;
              return (
                <div key={tam}
                  className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100">
                  <span
                    className="w-10 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'rgba(0,94,213,0.1)', color: '#005ED5' }}
                  >
                    {tam}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => ajustarQtd(tam, -1)}
                      aria-label={`Diminuir ${tam}`}
                      disabled={qtd <= 1}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 font-bold flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={qtd || ''}
                      onChange={e => setTamQtd(p => ({ ...p, [tam]: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-14 h-8 text-center text-sm font-bold outline-none rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                      style={{ color: '#005ED5' }}
                      aria-label={`Quantidade ${tam}`}
                    />
                    <button
                      type="button"
                      onClick={() => ajustarQtd(tam, 1)}
                      aria-label={`Aumentar ${tam}`}
                      className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 font-bold flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTamanho(tam)}
                    aria-label={`Remover ${tam}`}
                    className="ml-1 w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
function Etapa3({ register, errors, catSelecionada, modeloSelecionado, especificacoes, especificaçãoValues, quantidade }:
{
  register: ReturnType<typeof useForm<FormData>>['register'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
  catSelecionada: Linha | null;
  modeloSelecionado: Modelo | null;
  especificacoes: Especificacao[];
  especificaçãoValues: Record<number, string>;
  quantidade: number;
}) {
  const especificaçõesTexto = especificacoes
    .filter(a => especificaçãoValues[a.id])
    .map(a => `${a.nome}: ${a.variacoes.find(o => o.id === parseInt(especificaçãoValues[a.id]))?.valor ?? ''}`)
    .join(' · ');

  const nomeModelo = modeloSelecionado?.nome ?? catSelecionada?.nome ?? 'Outros';

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-500 mb-1">Etapa 3 de 3</p>
        <h3 className="text-xl font-black text-gray-900 mb-4">Seus dados para contato</h3>
      </div>

      {/* Resumo do pedido */}
      {(catSelecionada || modeloSelecionado || especificaçõesTexto) && (
        <div className="flex items-start gap-3 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(0,94,213,0.05)', border: '1px solid rgba(0,94,213,0.12)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(0,94,213,0.1)' }}>
            {(() => { const I = ICONE_CATEGORIA[catSelecionada?.slug ?? ''] ?? Package; return <I size={14} style={{ color: '#005ED5' }} />; })()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {nomeModelo} — {quantidade} peças
            </p>
            {especificaçõesTexto && <p className="text-gray-500 text-xs mt-0.5">{especificaçõesTexto}</p>}
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
