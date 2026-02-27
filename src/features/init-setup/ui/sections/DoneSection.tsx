import React from 'react';
import { Check } from 'lucide-react';
import type { DoneSectionProps } from '../types';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { action, layout, state, text } from '@/components/ui/_styles';

const pulseStyle: React.CSSProperties = { animationDuration: '3s' };

export default function DoneSection({ busy, onFinalize, onBack }: DoneSectionProps) {
  return (
    <div className={cn(layout.centerCol, state.enterZoomIn95, 'w-full my-auto text-center duration-700')}>
      <div className="relative mb-10">
        <div
          className="absolute inset-0 bg-emerald-500 rounded-full opacity-30 blur-2xl animate-pulse"
          style={pulseStyle}
        />
        <div
          className={cn(
            layout.center,
            'relative w-24 h-24 rounded-full bg-white dark:bg-slate-900 border-4 border-emerald-500/20 text-emerald-500 dark:text-emerald-400 shadow-2xl backdrop-blur-md',
          )}
        >
          <Check size={48} strokeWidth={4} />
        </div>
      </div>

      <h2 className={text.heroTitle}>セットアップ完了</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-12 leading-relaxed max-w-sm text-base">
        すべての設定が完了しました
      </p>

      <Button
        variant="success"
        size="none"
        radius="xl"
        className="h-14 px-12 text-lg font-bold shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 cursor-pointer"
        onClick={onFinalize}
        disabled={busy}
      >
        {busy ? <div className="spinner border-white" /> : 'AviUtl2 カタログを開く'}
      </Button>

      <button
        className={cn(
          action.initSecondary,
          'mt-8 h-10 text-xs text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
        )}
        onClick={onBack}
      >
        戻る
      </button>
    </div>
  );
}
