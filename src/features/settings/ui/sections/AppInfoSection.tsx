import { Info } from 'lucide-react';
import type { AppInfoSectionProps } from '../types';

export default function AppInfoSection({ appVersion }: AppInfoSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
        <Info size={18} className="text-slate-500 dark:text-slate-400" />
        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">アプリ情報</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 dark:text-slate-400">バージョン</span>
          <span className="font-medium">{appVersion || '-'}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">ライセンス</span>
            <span className="font-medium">MIT License</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            本ソフトウェアは MIT License に基づき提供されます。ライセンス全文は LICENSE.txt をご参照ください。
          </p>
        </div>
      </div>
    </section>
  );
}
