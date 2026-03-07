import AppIcon from '../../../../../src-tauri/icons/icon.svg';
import type { IntroSectionProps } from '../types';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { layout, media, state, text } from '@/components/ui/_styles';

export default function IntroSection({ canStart, onStart }: IntroSectionProps) {
  return (
    <div className={cn(layout.centerCol, state.enterZoomIn95, 'flex-1 text-center duration-700')}>
      <div className="relative mb-10 group cursor-default">
        <div
          className={cn(
            layout.center,
            'relative w-32 h-32 p-6 rounded-[28px] bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 transform transition-transform duration-500 group-hover:scale-105',
          )}
        >
          <img src={AppIcon} alt="AviUtl2 Catalog" className={media.fullContain} />
        </div>
      </div>

      <h1 className={text.heroTitle}>AviUtl2 カタログ</h1>

      <p className="text-slate-500 dark:text-slate-400 text-base leading-7 max-w-md mb-10">
        AviUtl2 カタログの初期設定を行います
      </p>

      <Button
        variant="primary"
        size="none"
        radius="xl"
        className={cn(
          'h-12 px-10 text-base font-bold shadow-lg shadow-blue-600/20',
          canStart ? 'hover:shadow-blue-600/30 hover:-translate-y-0.5' : 'shadow-none',
        )}
        onClick={onStart}
        disabled={!canStart}
      >
        セットアップを開始
      </Button>
    </div>
  );
}
