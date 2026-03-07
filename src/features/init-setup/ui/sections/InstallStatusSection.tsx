import { Download, FolderOpen } from 'lucide-react';
import type { InstallStatusSectionProps } from '../types';
import { cn } from '@/lib/cn';
import { action, state, text } from '@/components/ui/_styles';

const statusCardClass =
  'group relative flex flex-col items-start p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:ring-1 hover:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-xl text-left h-full cursor-pointer';
const statusIconClass =
  'mb-4 p-3 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-400 transition-colors';
const statusTitleClass =
  'text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors';

export default function InstallStatusSection({ onSelectInstalled, onBack }: InstallStatusSectionProps) {
  return (
    <div className={cn(state.enterSlideRight500, 'flex-1 flex flex-col justify-center')}>
      <div className="text-center mb-8">
        <h2 className={text.title2xl}>インストールの状況</h2>
        <p className={text.mutedSmMt2}>AviUtl2 の導入状況に合わせて選択してください</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto w-full">
        <button onClick={() => onSelectInstalled(true)} className={statusCardClass}>
          <div className={statusIconClass}>
            <FolderOpen size={28} />
          </div>
          <div className={statusTitleClass}>インストール済み</div>
          <p className={text.mutedXsRelaxed}>すでに AviUtl2 をインストール済みの場合</p>
        </button>

        <button onClick={() => onSelectInstalled(false)} className={statusCardClass}>
          <div className={statusIconClass}>
            <Download size={28} />
          </div>
          <div className={statusTitleClass}>新規インストール</div>
          <p className={text.mutedXsRelaxed}>
            AviUtl2 を導入していない場合
            <br />
            最新版を自動でダウンロードして導入します
          </p>
        </button>
      </div>

      <div className="text-center mt-auto">
        <button className={cn(action.initSecondary, 'h-10')} onClick={onBack}>
          戻る
        </button>
      </div>
    </div>
  );
}
