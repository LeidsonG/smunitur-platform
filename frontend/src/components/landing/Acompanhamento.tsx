'use client';

import { useState } from 'react';
import { Search, CheckCircle, Clock, Package, Truck, XCircle, Eye, Loader2 } from 'lucide-react';
import api from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: React.ElementType; desc: string }> = {
  recebido: {
    label: 'Recebido',
    cor: '#6B7280',
    icon: CheckCircle,
    desc: 'Seu orçamento foi recebido e está na fila para análise.',
  },
  em_analise: {
    label: 'Em Análise',
    cor: '#F59E0B',
    icon: Eye,
    desc: 'Nossa equipe está analisando os detalhes do seu pedido.',
  },
  aguardando_aprovacao: {
    label: 'Aguardando Aprovação',
    cor: '#8B5CF6',
    icon: Clock,
    desc: 'O orçamento foi enviado. Aguardando sua confirmação para iniciar.',
  },
  em_producao: {
    label: 'Em Produção',
    cor: '#005ED5',
    icon: Package,
    desc: 'Ótima notícia! Seu pedido está sendo produzido.',
  },
  finalizado: {
    label: 'Finalizado',
    cor: '#10B981',
    icon: CheckCircle,
    desc: 'Produção concluída! Seu pedido está pronto.',
  },
  enviado: {
    label: 'Enviado',
    cor: '#FF9400',
    icon: Truck,
    desc: 'Seu pedido foi enviado e está a caminho!',
  },
  cancelado: {
    label: 'Cancelado',
    cor: '#EF4444',
    icon: XCircle,
    desc: 'Este orçamento foi cancelado. Entre em contato para mais informações.',
  },
};

interface Historico {
  statusNovo: string;
  observacao: string | null;
  createdAt: string;
}

interface OrcamentoStatus {
  numero: number;
  nomeCliente: string;
  produtoDesejado: string;
  quantidade: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  historicos: Historico[];
}

export default function Acompanhamento() {
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(false);
  const [orcamento, setOrcamento] = useState<OrcamentoStatus | null>(null);
  const [erro, setErro] = useState('');

  const buscar = async () => {
    if (!numero.trim()) return;
    setLoading(true);
    setErro('');
    setOrcamento(null);

    try {
      const res = await api.get(`/orcamentos/acompanhar/${numero.trim()}`);
      setOrcamento(res.data.orcamento);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 404) {
        setErro('Orçamento não encontrado. Verifique o número e tente novamente.');
      } else {
        setErro('Erro ao buscar orçamento. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusInfo = orcamento ? STATUS_CONFIG[orcamento.status] : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <section id="acompanhar" className="py-12 lg:py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{ background: 'rgba(0,94,213,0.1)', color: '#005ED5' }}
          >
            Acompanhar Pedido
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
            Acompanhe sua{' '}
            <span style={{ color: '#005ED5' }}>produção</span>
          </h2>
          <p className="text-gray-600 text-lg">
            Informe o número do seu orçamento para ver o status em tempo real.
          </p>
        </div>

        {/* Busca */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Digite o número do orçamento (ex: 100)"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors"
            />
            <button
              onClick={buscar}
              disabled={loading || !numero.trim()}
              className="px-6 py-3 rounded-xl font-semibold text-white flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#005ED5' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Buscar
            </button>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100 mb-6">
            <XCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        {/* Resultado */}
        {orcamento && statusInfo && StatusIcon && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            {/* Header do status */}
            <div
              className="p-6 text-white"
              style={{ background: statusInfo.cor }}
            >
              <div className="flex items-center gap-3 mb-2">
                <StatusIcon size={24} />
                <span className="text-lg font-bold">{statusInfo.label}</span>
              </div>
              <p className="text-sm opacity-90">{statusInfo.desc}</p>
            </div>

            {/* Info do pedido */}
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3">Orçamento #{orcamento.numero}</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Cliente:</span>
                  <span className="ml-2 font-medium text-gray-800">{orcamento.nomeCliente}</span>
                </div>
                <div>
                  <span className="text-gray-500">Produto:</span>
                  <span className="ml-2 font-medium text-gray-800">{orcamento.produtoDesejado}</span>
                </div>
                <div>
                  <span className="text-gray-500">Quantidade:</span>
                  <span className="ml-2 font-medium text-gray-800">{orcamento.quantidade} un.</span>
                </div>
                <div>
                  <span className="text-gray-500">Solicitado em:</span>
                  <span className="ml-2 font-medium text-gray-800">
                    {new Date(orcamento.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Histórico */}
            {orcamento.historicos.length > 0 && (
              <div className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Histórico de Status</h4>
                <div className="space-y-3">
                  {orcamento.historicos.map((h, i) => {
                    const info = STATUS_CONFIG[h.statusNovo];
                    return (
                      <div key={i} className="flex gap-3 items-start">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ background: info?.cor || '#9CA3AF' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">
                              {info?.label || h.statusNovo}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(h.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {h.observacao && (
                            <p className="text-xs text-gray-500 mt-0.5">{h.observacao}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
