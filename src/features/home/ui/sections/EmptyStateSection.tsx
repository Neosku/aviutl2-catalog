import { Package } from 'lucide-react';
import type { EmptyStateSectionProps } from '../types';

export default function EmptyStateSection({ onClearConditions }: EmptyStateSectionProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl select-none min-h-[300px]">
      <Package size={48} className="mb-4 opacity-50" />
      <p>条件に一致するパッケージはありません</p>
      <button
        onClick={onClearConditions}
        className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
        type="button"
      >
        条件をクリア
      </button>
    </div>
  );
}
