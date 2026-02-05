/**
 * 削除ボタンコンポーネント
 */
import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import type { DeleteButtonProps } from '../types';
const DeleteButton = memo(function DeleteButton({ onClick, ariaLabel = '削除', title }: DeleteButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      onClick={onClick}
    >
      <Trash2 size={18} />
    </button>
  );
});

export default DeleteButton;
