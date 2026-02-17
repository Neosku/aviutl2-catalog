import React from 'react';
import { Check } from 'lucide-react';
import type { DoneSectionProps } from '../types';

const pulseStyle: React.CSSProperties = { animationDuration: '3s' };

export default function DoneSection({ busy, onFinalize, onBack }: DoneSectionProps) {
  return (
    <div className="w-full flex flex-col items-center my-auto text-center animate-in fade-in zoom-in-95 duration-700">
      <div className="relative mb-10">
        <div
          className="absolute inset-0 bg-emerald-500 rounded-full opacity-30 blur-2xl animate-pulse"
          style={pulseStyle}
        />
        <div className="relative w-24 h-24 rounded-full bg-white dark:bg-slate-900 border-4 border-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shadow-2xl backdrop-blur-md">
          <Check size={48} strokeWidth={4} />
        </div>
      </div>

      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">セットアップ完了</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-12 leading-relaxed max-w-sm text-base">
        すべての設定が完了しました
      </p>

      <button
        className="btn btn--primary h-14 px-12 rounded-xl text-lg font-bold shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent cursor-pointer"
        onClick={onFinalize}
        disabled={busy}
      >
        {busy ? <div className="spinner border-white" /> : 'AviUtl2 カタログを開く'}
      </button>

      <button
        className="mt-8 h-10 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
        onClick={onBack}
      >
        戻る
      </button>
    </div>
  );
}
