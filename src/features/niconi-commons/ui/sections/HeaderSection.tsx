import { Check, Copy } from 'lucide-react';
import type { HeaderSectionProps } from '../types';

export default function HeaderSection({ copyState, selectedCount, onCopySelected }: HeaderSectionProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold mb-1">ニコニ・コモンズID</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          インストール済みでニコニ・コモンズIDが登録されているパッケージの一覧を表示します
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className={`btn btn--primary cursor-pointer ${copyState.ok ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          onClick={onCopySelected}
          disabled={selectedCount === 0}
          type="button"
        >
          {copyState.ok ? <Check size={16} /> : <Copy size={16} />}
          {copyState.ok ? `${copyState.count}件コピーしました` : 'ニコニ・コモンズIDをコピー'}
        </button>
      </div>
    </div>
  );
}
