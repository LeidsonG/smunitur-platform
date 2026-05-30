'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Clock, Eye, X } from 'lucide-react';
import api from '@/lib/api';
import { STATUS_LIST, statusInfo } from '@/lib/orcamentoStatus';
import { ToastContainer, ToastData, ToastType } from '@/components/admin/Toast';

const STATUS_EM_PRODUCAO = ['em_analise', 'aguardando_aprovacao', 'em_producao'];

interface OrcProd {
  id: number; numero: number; nomeCliente: string;
  modeloDesejado: string; quantidade: number; status: string;
  createdAt: string; updatedAt: string;
}

interface Historico {
  statusNovo: string; observacao: string | null; createdAt: string;
  usuario?: { nome: string } | null;
}

export default function ProducaoPage() {
  const [orcamentos, setOrcamentos] = useState<OrcProd[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<OrcProd | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [novoStatus, setNovoStatus] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/producao');
      setOrcamentos(res.data.orcamentos);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirDetalhe = async (o: OrcProd) => {
    setSelecionado(o);
    setNovoStatus(o.status);
    setObs('');
    const res = await api.get(`/producao/${o.id}/historico`);
    setHistorico(res.data.historico);
  };

  const fecharModal = () => setSelecionado(null);

  const salvarStatus = async () => {
    if (!selecionado) return;
    setSalvando(true);
    try {
      await api.patch(`/orcamentos/${selecionado.id}/status`, { status: novoStatus, observacao: obs });
      setOrcamentos(prev =>
        prev.map(o => o.id === selecionado.id ? { ...o, status: novoStatus } : o)
          .filter(o => STATUS_EM_PRODUCAO.includes(o.status))
      );
      setSelecionado({ ...selecionado, status: novoStatus });
      setObs('');
      const res = await api.get(`/producao/${selecionado.id}/historico`);
      setHistorico(res.data.historico);
      addToast(`Status atualizado: ${statusInfo(novoStatus).label}`);
    } catch {
      addToast('Erro ao atualizar status', 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Painel de Produção</h1>
        <p className="text-gray-500 text-sm mt-1">
          Orçamentos em andamento — análise, aprovação e produção
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin" style={{ borderTopColor: '#005ED5' }} />
        </div>
      ) : orcamentos.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">Nenhum orçamento em produção no momento</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orcamentos.map((o) => {
            const s = statusInfo(o.status);
            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => abrirDetalhe(o)}
              >
                <div className="h-1.5" style={{ background: s.cor }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: `${s.cor}18`, color: s.cor }}
                    >
                      #{o.numero}
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: `${s.cor}18`, color: s.cor }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{o.nomeCliente}</h3>
                  <p className="text-sm text-gray-500 mb-4 truncate">{o.modeloDesejado} — {o.quantidade} un.</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                    <span className="flex items-center gap-1 font-medium" style={{ color: '#005ED5' }}>
                      <Eye size={12} /> Detalhes
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — bottom-sheet no mobile, centralizado no desktop */}
      {selecionado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Orçamento #{selecionado.numero}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selecionado.nomeCliente}</p>
              </div>
              <button onClick={fecharModal} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-sm">
              <div className="p-3 rounded-xl bg-gray-50">
                <p className="font-medium text-gray-700">{selecionado.modeloDesejado}</p>
                <p className="text-xs text-gray-400 mt-0.5">{selecionado.quantidade} unidades · entrada {new Date(selecionado.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>

              {/* Atualizar status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Atualizar Status
                </label>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-blue-400 bg-white"
                >
                  {STATUS_LIST.filter(o => o.value !== 'recebido').map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <textarea
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Observação (opcional)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:border-blue-400 resize-none"
                />
                <button
                  onClick={salvarStatus}
                  disabled={salvando || novoStatus === selecionado.status}
                  className="w-full py-3 sm:py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: '#005ED5' }}
                >
                  {salvando ? 'Salvando...' : 'Atualizar Status'}
                </button>
              </div>

              {/* Histórico */}
              {historico.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Histórico</p>
                  <div className="space-y-3">
                    {historico.map((h, i) => {
                      const info = statusInfo(h.statusNovo);
                      return (
                        <div key={i} className="flex gap-3 text-xs">
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: info.cor }} />
                          <div className="flex-1">
                            <span className="font-semibold text-gray-800">{info.label}</span>
                            {h.observacao && <span className="text-gray-500"> — {h.observacao}</span>}
                            <div className="text-gray-400 mt-0.5">
                              {new Date(h.createdAt).toLocaleString('pt-BR')}
                              {h.usuario && <span> · {h.usuario.nome}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
