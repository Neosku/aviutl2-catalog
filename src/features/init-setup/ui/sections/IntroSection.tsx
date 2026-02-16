import React from 'react';
import AppIcon from '../../../../../src-tauri/icons/icon.svg';
import type { IntroSectionProps } from '../types';

export default function IntroSection({ canStart, onStart }: IntroSectionProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-700">
      <div className="relative mb-10 group cursor-default">
        <div className="relative w-32 h-32 p-6 rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center transform transition-transform duration-500 group-hover:scale-105">
          <img src={AppIcon} alt="AviUtl2 Catalog" className="w-full h-full object-contain" />
        </div>
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">AviUtl2 カタログ</h1>

      <p className="text-slate-500 dark:text-slate-400 text-base leading-7 max-w-md mb-10">
        AviUtl2 カタログの初期設定を行います
      </p>

      <button
        className={`btn btn--primary h-12 px-10 rounded-xl text-base font-bold shadow-lg shadow-blue-600/20 transition-all bg-blue-600 border-transparent text-white ${
          canStart
            ? 'hover:shadow-blue-600/30 hover:-translate-y-0.5 hover:bg-blue-700 cursor-pointer'
            : 'opacity-50 cursor-not-allowed shadow-none'
        }`}
        onClick={onStart}
        disabled={!canStart}
      >
        セットアップを開始
      </button>
    </div>
  );
}
