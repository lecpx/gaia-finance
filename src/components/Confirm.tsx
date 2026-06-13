import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const Confirm: React.FC<ConfirmProps> = ({ open, title, message, confirmLabel = 'Xác nhận', onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{message}</p>
          </div>
          <button onClick={onCancel} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="secondary-button">Hủy</button>
          <button onClick={onConfirm} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:translate-y-px">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Confirm;
