'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { gerarLinkWhatsApp } from '@/lib/whatsapp';
import Reveal from './Reveal';

const schema = z.object({
  nome_cliente: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  telefone_cliente: z.string().min(10, 'Telefone inválido'),
  email_cliente: z.string().email('E-mail inválido'),
  cpf_cnpj: z.string().optional(),
  produto_desejado: z.string().min(1, 'Selecione um produto'),
  quantidade: z.string().refine((v) => /^\d+$/.test(v) && parseInt(v) >= 1, {
    message: 'Informe uma quantidade inteira válida (mínimo 1)',
  }),
  tamanhos: z.string().optional(),
  cores: z.string().optional(),
  detalhes: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Categoria { id: number; nome: string; slug: string }
interface Opcao { id: number; valor: string }
interface Atributo { id: number; nome: string; obrigatorio: boolean; opcoes: Opcao[] }

type Estado = 'idle' | 'loading' | 'success' | 'error';

interface ResultadoOrcamento { numero: number; linkWhatsApp: string }

export default function FormularioOrcamento() {
  const [estado, setEstado] = useState<Estado>('idle');
  const [resultado, setResultado] = useState<ResultadoOrcamento | null>(null);
  const [imagemFile, setImagemFile] = useState<File | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [atributos, setAtributos] = useState<Atributo[]>([]);
  const [atributoValues, setAtributoValues] = useState<Record<number, string>>({});
  const [atributoErrors, setAtributoErrors] = useState<Record<number, string>>({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const produtoWatch = watch('produto_desejado');

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data.categorias)).catch(() => {});
  }, []);

  useEffect(() => {
    const cat = categorias.find(c => c.nome === produtoWatch);
    setAtributoValues({});
    setAtributoErrors({});
    if (cat) {
      api.get(`/categorias/${cat.id}/atributos`)
        .then(r => setAtributos(r.data.atributos))
        .catch(() => setAtributos([]));
    } else {
      setAtributos([]);
    }
  }, [produtoWatch, categorias]);

  const onSubmit = async (data: FormData) => {
    // Valida atributos obrigatórios
    const newErrors: Record<number, string> = {};
    atributos.forEach(a => {
      if (a.obrigatorio && !atributoValues[a.id]) {
        newErrors[a.id] = `${a.nome} é obrigatório`;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setAtributoErrors(newErrors);
      return;
    }

    setEstado('loading');
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => { if (value) formData.append(key, value); });
      if (imagemFile) formData.append('imagem_referencia', imagemFile);

      const atributosData = atributos
        .filter(a => atributoValues[a.id])
        .map(a => ({ atributo_id: a.id, opcao_id: parseInt(atributoValues[a.id]) }));
      if (atributosData.length > 0) {
        formData.append('atributos', JSON.stringify(atributosData));
      }

      const res = await api.post('/orcamentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const orcamento = res.data.orcamento;

      // Monta texto de atributos para o WhatsApp
      const atributosTexto = atributos
        .filter(a => atributoValues[a.id])
        .map(a => {
          const opcao = a.opcoes.find(o => o.id === parseInt(atributoValues[a.id]));
          return `${a.nome}: ${opcao?.valor ?? ''}`;
        })
        .join('\n');

      const detalhesComAtributos = [atributosTexto, data.detalhes].filter(Boolean).join('\n\n');

      const link = gerarLinkWhatsApp({
        numero: orcamento.numero,
        nomeCliente: data.nome_cliente,
        telefoneCliente: data.telefone_cliente,
        emailCliente: data.email_cliente,
        cpfCnpj: data.cpf_cnpj,
        produtoDesejado: data.produto_desejado,
        quantidade: parseInt(data.quantidade),
        tamanhos: data.tamanhos,
        cores: data.cores,
        detalhes: detalhesComAtributos || undefined,
        observacoes: data.observacoes,
      });

      setResultado({ numero: orcamento.numero, linkWhatsApp: link });
      setEstado('success');
      reset();
      setImagemFile(null);
      setAtributos([]);
      setAtributoValues({});

      window.open(link, '_blank');
    } catch {
      setEstado('error');
    }
  };

  if (estado === 'success' && resultado) {
    return (
      <section id="orcamento" className="py-10 sm:py-12 lg:py-16" style={{ background: '#F8F9FA' }}>
        <div className="max-w-xl mx-auto px-4 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(0,94,213,0.1)' }}
          >
            <CheckCircle size={40} style={{ color: '#005ED5' }} />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">Orçamento Enviado!</h2>
          <p className="text-gray-600 mb-2">Seu orçamento foi registrado com o número:</p>
          <div
            className="inline-block text-4xl font-black mb-6 px-6 py-3 rounded-2xl"
            style={{ color: '#005ED5', background: 'rgba(0,94,213,0.1)' }}
          >
            #{resultado.numero}
          </div>
          <p className="text-gray-600 mb-8">
            Guarde este número para acompanhar o andamento da sua produção. Clique abaixo para
            finalizar pelo WhatsApp:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={resultado.linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-full font-bold text-white transition-all hover:scale-105"
              style={{ background: '#25D366' }}
            >
              💬 Confirmar pelo WhatsApp
            </a>
            <button
              type="button"
              onClick={() => { setEstado('idle'); setResultado(null); }}
              className="px-6 py-3 rounded-full font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
            >
              Novo Orçamento
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Acompanhe seu pedido na seção{' '}
            <button
              type="button"
              onClick={() => document.querySelector('#acompanhar')?.scrollIntoView({ behavior: 'smooth' })}
              className="underline font-medium"
              style={{ color: '#005ED5' }}
            >
              Acompanhar Pedido
            </button>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="orcamento" className="py-10 sm:py-12 lg:py-16" style={{ background: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10 sm:mb-12">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(255,148,0,0.1)', color: '#FF9400' }}
          >
            Orçamento Grátis
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            Solicite seu{' '}
            <span style={{ color: '#005ED5' }}>orçamento</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Preencha o formulário e nossa equipe retornará em até 24h com o melhor valor para seu projeto.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-6 sm:p-8 lg:p-10">
          {estado === 'error' && (
            <div className="flex items-center gap-3 p-4 rounded-xl mb-6 bg-red-50 border border-red-100">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">
                Ocorreu um erro ao enviar o orçamento. Verifique sua conexão e tente novamente.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Dados do cliente */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Dados do Cliente
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nome completo *" error={errors.nome_cliente?.message}>
                  <input {...register('nome_cliente')} placeholder="Seu nome" />
                </Field>
                <Field label="Telefone / WhatsApp *" error={errors.telefone_cliente?.message}>
                  <input {...register('telefone_cliente')} placeholder="(17) 99999-9999" />
                </Field>
                <Field label="E-mail *" error={errors.email_cliente?.message}>
                  <input {...register('email_cliente')} type="email" placeholder="seu@email.com" />
                </Field>
                <Field label="CPF / CNPJ (se empresa)">
                  <input {...register('cpf_cnpj')} placeholder="Opcional" />
                </Field>
              </div>
            </div>

            {/* Dados do pedido */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Dados do Pedido
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Produto desejado *" error={errors.produto_desejado?.message}>
                  <select {...register('produto_desejado')}>
                    <option value="">Selecione...</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                    <option value="Outros (especificar nos detalhes)">Outros (especificar nos detalhes)</option>
                  </select>
                </Field>
                <Field label="Quantidade *" error={errors.quantidade?.message}>
                  <input {...register('quantidade')} type="number" min="1" step="1" placeholder="Ex: 50" />
                </Field>
              </div>

              {/* Atributos dinâmicos */}
              {atributos.length > 0 && (
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  {atributos.map(atributo => (
                    <div key={atributo.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {atributo.nome}
                        {atributo.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <select
                        value={atributoValues[atributo.id] ?? ''}
                        onChange={e => {
                          setAtributoValues(prev => ({ ...prev, [atributo.id]: e.target.value }));
                          if (e.target.value) {
                            setAtributoErrors(prev => { const n = { ...prev }; delete n[atributo.id]; return n; });
                          }
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors focus:ring-2 ${
                          atributoErrors[atributo.id]
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-400 focus:ring-blue-50'
                        }`}
                      >
                        <option value="">Selecione...</option>
                        {atributo.opcoes.map(opcao => (
                          <option key={opcao.id} value={String(opcao.id)}>{opcao.valor}</option>
                        ))}
                      </select>
                      {atributoErrors[atributo.id] && (
                        <p className="mt-1 text-xs text-red-500">{atributoErrors[atributo.id]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field label="Tamanhos (ex: P, M, G, GG)">
                  <input {...register('tamanhos')} placeholder="Ex: 10 P, 20 M, 20 G" />
                </Field>
                <Field label="Cores desejadas">
                  <input {...register('cores')} placeholder="Ex: Azul marinho, branco" />
                </Field>
              </div>
            </div>

            {/* Detalhes */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Detalhes personalizados">
                <textarea
                  {...register('detalhes')}
                  rows={3}
                  placeholder="Bordado, estampa, logo, posicionamento..."
                />
              </Field>
              <Field label="Observações">
                <textarea
                  {...register('observacoes')}
                  rows={3}
                  placeholder="Informações adicionais..."
                />
              </Field>
            </div>

            {/* Upload de imagem */}
            <div>
              <label htmlFor="img-upload" className="block text-sm font-medium text-gray-700 mb-1.5">
                Imagem de referência (opcional)
              </label>
              <button
                type="button"
                onClick={() => document.getElementById('img-upload')?.click()}
                className="w-full border-2 border-dashed rounded-xl p-6 text-center hover:border-blue-400 transition-colors"
                style={{ borderColor: imagemFile ? '#005ED5' : '#D1D5DB' }}
              >
                <Upload size={24} className="mx-auto mb-2 text-gray-400 pointer-events-none" />
                {imagemFile ? (
                  <p className="text-sm font-medium pointer-events-none" style={{ color: '#005ED5' }}>
                    {imagemFile.name}
                  </p>
                ) : (
                  <div className="pointer-events-none">
                    <p className="text-sm text-gray-600">Toque para enviar ou arraste aqui</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP — máx. 5MB</p>
                  </div>
                )}
              </button>
              <input
                id="img-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => setImagemFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <button
              type="submit"
              disabled={estado === 'loading'}
              className="w-full py-4 rounded-full font-bold text-white text-lg flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              style={{ background: 'linear-gradient(135deg, #005ED5, #FF9400)' }}
            >
              {estado === 'loading' ? (
                <><Loader2 size={20} className="animate-spin" />Enviando orçamento...</>
              ) : (
                <><Send size={20} />Enviar Orçamento Grátis</>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              Ao enviar, você concorda com nosso uso dos dados para fins de atendimento comercial.
            </p>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

function Field({
  label, error, children,
}: {
  label: string; error?: string; children: React.ReactElement;
}) {
  const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors focus:ring-2 ${
    error
      ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
      : 'border-gray-200 focus:border-blue-400 focus:ring-blue-50'
  }`;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {child.type === 'textarea'
        ? <textarea {...(child.props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} className={inputClass} />
        : child.type === 'select'
        ? <select {...(child.props as React.SelectHTMLAttributes<HTMLSelectElement>)} className={inputClass} />
        : <input {...(child.props as React.InputHTMLAttributes<HTMLInputElement>)} className={inputClass} />}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
