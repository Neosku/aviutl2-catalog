import React from 'react';
import { Download, FolderOpen } from 'lucide-react';
import type { InstallStatusSectionProps } from '../types';

export default function InstallStatusSection({ onSelectInstalled, onBack }: InstallStatusSectionProps) {
  return (
    <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">インストールの状況</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">AviUtl2 の導入状況に合わせて選択してください</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto w-full">
        <button
          onClick={() => onSelectInstalled(true)}
          className="group relative flex flex-col items-start p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:ring-1 hover:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl text-left h-full cursor-pointer"
        >
          <div className="mb-4 p-3 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 transition-colors">
            <FolderOpen size={28} />
          </div>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            インストール済み
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            すでに AviUtl2 をインストール済みの場合
          </p>
        </button>

        <button
          onClick={() => onSelectInstalled(false)}
          className="group relative flex flex-col items-start p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:ring-1 hover:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl text-left h-full cursor-pointer"
        >
          <div className="mb-4 p-3 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 transition-colors">
            <Download size={28} />
          </div>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            新規インストール
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            AviUtl2 を導入していない場合
            <br />
            最新版を自動でダウンロードして導入します
          </p>
        </button>
      </div>

      <div className="text-center mt-auto">
        <button
          className="h-10 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
          onClick={onBack}
        >
          戻る
        </button>
      </div>
    </div>
  );
}
