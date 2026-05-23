import { AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  titulo: string;
  mensagem: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  carregando?: boolean;
}

export default function ConfirmModal({
  titulo,
  mensagem,
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel,
  carregando,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !carregando) onCancel(); }}
    >
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <AlertTriangle size={20} style={{ color: '#EF4444' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base">{titulo}</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{mensagem}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={carregando}
              className="flex-1 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={carregando}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#EF4444' }}
            >
              {carregando && <Loader2 size={14} className="animate-spin" />}
              {carregando ? 'Aguarde...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
