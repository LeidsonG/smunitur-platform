'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Package, Factory, CheckCircle, TrendingUp, Clock } from 'lucide-react';
import api from '@/lib/api';

interface Stats {
  totalOrcamentos: number;
  orcamentosRecebidos: number;
  orcamentosEmProducao: number;
  orcamentosFinalizados: number;
  totalProdutos: number;
}

interface UltimoOrcamento {
  numero: number;
  nomeCliente: string;
  produtoDesejado: string;
  status: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  recebido: 'Recebido',
  em_analise: 'Em Análise',
  aguardando_aprovacao: 'Ag. Aprovação',
  em_producao: 'Em Produção',
  finalizado: 'Finalizado',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  recebido: '#6B7280',
  em_analise: '#F59E0B',
  aguardando_aprovacao: '#8B5CF6',
  em_producao: '#005ED5',
  finalizado: '#10B981',
  enviado: '#FF9400',
  cancelado: '#EF4444',
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [ultimos, setUltimos] = useState<UltimoOrcamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res) => {
        setStats(res.data.stats);
        setUltimos(res.data.ultimosOrcamentos);
      })
      .catch(() => router.push('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
      </div>
    );
  }

  const cards = [
    { label: 'Total de Orçamentos', value: stats?.totalOrcamentos ?? 0, icon: FileText, cor: '#005ED5' },
    { label: 'Novos (Recebidos)', value: stats?.orcamentosRecebidos ?? 0, icon: Clock, cor: '#F59E0B' },
    { label: 'Em Produção', value: stats?.orcamentosEmProducao ?? 0, icon: Factory, cor: '#8B5CF6' },
    { label: 'Finalizados', value: stats?.orcamentosFinalizados ?? 0, icon: CheckCircle, cor: '#10B981' },
    { label: 'Produtos Ativos', value: stats?.totalProdutos ?? 0, icon: Package, cor: '#FF9400' },
    { label: 'Conversão', value: `${stats?.totalOrcamentos ? Math.round((stats.orcamentosFinalizados / stats.totalOrcamentos) * 100) : 0}%`, icon: TrendingUp, cor: '#005ED5' },
  ];

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do sistema SM Unitur</p>
      </div>

      {/* Cards de stat */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, cor }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${cor}18` }}
              >
                <Icon size={20} style={{ color: cor }} />
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Últimos orçamentos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Últimos Orçamentos</h2>
          <button
            onClick={() => router.push('/admin/orcamentos')}
            className="text-sm font-medium hover:underline"
            style={{ color: '#005ED5' }}
          >
            Ver todos
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {ultimos.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400 text-sm">Nenhum orçamento ainda</p>
          ) : (
            ultimos.map((o) => (
              <div key={o.numero} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: '#005ED5' }}
                >
                  #{o.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{o.nomeCliente}</p>
                  <p className="text-xs text-gray-500 truncate">{o.produtoDesejado}</p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                  style={{
                    background: `${STATUS_COLOR[o.status]}18`,
                    color: STATUS_COLOR[o.status],
                  }}
                >
                  {STATUS_LABEL[o.status] || o.status}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
