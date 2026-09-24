import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Toast: React.FC = () => {
  const { toastMessage, showToast } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-[#ECFDF3] px-4 py-3 text-xs font-bold text-emerald-900 shadow-xl shadow-emerald-900/10 transition-all animate-bounce">
      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
      <span>{toastMessage}</span>
      <button
        onClick={() => showToast('')}
        className="rounded-full p-1 text-emerald-700 hover:bg-emerald-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
