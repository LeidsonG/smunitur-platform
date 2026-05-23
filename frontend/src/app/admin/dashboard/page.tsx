'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Package, Factory, CheckCircle, Clock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';

interface Stats {
  totalOrcamentos: number;
  orcamentosRecebidos: number;
  orcamentosEmProducao: number;
  orcamentosFinalizados: number;
  totalProdutos: number;
}

interface PorMes { mes: string; total: number }

interface UltimoOrcamento {
  numero: number;
  nomeCliente: string;
  produtoDesejado: string;
  status: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  recebido: 'Recebido', em_analise: 'Em Análise', aguardando_aprovacao: 'Ag. Aprovação',
  em_producao: 'Em Produção', finalizado: 'Finalizado', enviado: 'Enviado', cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  recebido: '#6B7280', em_analise: '#F59E0B', aguardando_aprovacao: '#8B5CF6',
  em_producao: '#005ED5', finalizado: '#10B981', enviado: '#FF9400', cancelado: '#EF4444',
};

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_FULL  = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatarMes(mes: string, completo = false) {
  const [, m] = mes.split('-');
  return (completo ? MESES_FULL : MESES_ABREV)[parseInt(m) - 1];
}

// Tooltip personalizado do gráfico
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-2.5 text-sm">
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className="font-bold" style={{ color: '#005ED5' }}>
        {payload[0].value} orçamento{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [porMes, setPorMes] = useState<PorMes[]>([]);
  const [ultimos, setUltimos] = useState<UltimoOrcamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res) => {
        setStats(res.data.stats);
        setPorMes(res.data.orcamentosPorMes);
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
    { label: 'Aguardando Análise', value: stats?.orcamentosRecebidos ?? 0, icon: Clock, cor: '#F59E0B' },
    { label: 'Em Produção', value: stats?.orcamentosEmProducao ?? 0, icon: Factory, cor: '#8B5CF6' },
    { label: 'Finalizados', value: stats?.orcamentosFinalizados ?? 0, icon: CheckCircle, cor: '#10B981' },
    { label: 'Produtos Ativos', value: stats?.totalProdutos ?? 0, icon: Package, cor: '#FF9400' },
  ];

  const dadosGrafico = porMes.map(p => ({ ...p, label: formatarMes(p.mes) }));
  const totalPeriodo = porMes.reduce((s, p) => s + p.total, 0);
  const maiorMes = porMes.reduce((a, b) => b.total > a.total ? b : a, { mes: '', total: 0 });
  const mediasMes = totalPeriodo / 12;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral e análise de orçamentos</p>
      </div>

      {/* Cards de stat */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {cards.map(({ label, value, icon: Icon, cor }) => (
          <div key={label} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${cor}18` }}
            >
              <Icon size={18} style={{ color: cor }} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">{value}</div>
            <div className="text-xs sm:text-sm text-gray-500 mt-1 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de orçamentos por mês */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6 sm:mb-8">
        {/* Header do gráfico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-bold text-gray-900">Orçamentos por Mês</h2>
            <p className="text-xs text-gray-400 mt-0.5">Últimos 12 meses</p>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-xl font-black text-gray-900">{totalPeriodo}</p>
              <p className="text-xs text-gray-400">Total 12 meses</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black" style={{ color: '#005ED5' }}>{mediasMes.toFixed(1)}</p>
              <p className="text-xs text-gray-400">Média/mês</p>
            </div>
            {maiorMes.total > 0 && (
              <div className="text-center">
                <p className="text-xl font-black" style={{ color: '#10B981' }}>{maiorMes.total}</p>
                <p className="text-xs text-gray-400">Pico — {formatarMes(maiorMes.mes, true)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Área do gráfico */}
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dadosGrafico} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#005ED5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#005ED5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#005ED5"
                strokeWidth={2.5}
                fill="url(#gradBlue)"
                dot={{ fill: '#005ED5', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#005ED5', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Últimos orçamentos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
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
              <div key={o.numero} className="px-5 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 hover:bg-gray-50 transition-colors">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: '#005ED5' }}
                >
                  #{o.numero}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{o.nomeCliente}</p>
                  <p className="text-xs text-gray-500 truncate">{o.produtoDesejado}</p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 hidden sm:inline-block"
                  style={{ background: `${STATUS_COLOR[o.status]}18`, color: STATUS_COLOR[o.status] }}
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
