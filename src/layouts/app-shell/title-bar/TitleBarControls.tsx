import type { CSSProperties } from 'react';
import { Copy, Minus, Square, X } from 'lucide-react';

interface TitleBarControlsProps {
  max: boolean;
  onMinimize: () => Promise<void>;
  onToggleMaximize: () => Promise<void>;
  onClose: () => Promise<void>;
  noDragStyle: CSSProperties;
}

export default function TitleBarControls({
  max,
  onMinimize,
  onToggleMaximize,
  onClose,
  noDragStyle,
}: TitleBarControlsProps) {
  const baseBtn = 'h-8 w-12 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors';
  const controlBtn = 'hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700';

  return (
    <div className="flex items-stretch" data-tauri-drag-region="false" data-no-drag="true" style={noDragStyle}>
      <button
        className={`${baseBtn} ${controlBtn}`}
        onClick={() => void onMinimize()}
        title="最小化"
        aria-label="最小化"
        type="button"
        style={noDragStyle}
      >
        <Minus size={15} />
      </button>
      <button
        className={`${baseBtn} ${controlBtn}`}
        onClick={() => void onToggleMaximize()}
        onDoubleClick={() => void onToggleMaximize()}
        title={max ? '元に戻す' : '最大化'}
        aria-label="最大化"
        type="button"
        style={noDragStyle}
      >
        {max ? <Copy size={13} className="scale-x-[-1]" /> : <Square size={13} />}
      </button>
      <button
        className={`${baseBtn} hover:bg-red-600 hover:text-white active:bg-red-700`}
        onClick={() => void onClose()}
        title="閉じる"
        aria-label="閉じる"
        type="button"
        style={noDragStyle}
      >
        <X size={15} />
      </button>
    </div>
  );
}
