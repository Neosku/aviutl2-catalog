import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { CheckCircle2, Download, RefreshCw, Trash2 } from 'lucide-react';
import ProgressCircle from '../../../../../components/ProgressCircle';
import type { PackageSidebarSectionProps } from '../../types';
import { cn } from '@/lib/cn';
import { layout, surface } from '@/components/ui/_styles';

type PackageSidebarActionsCardProps = Pick<
  PackageSidebarSectionProps,
  'item' | 'canInstall' | 'busyAction' | 'isBusy' | 'progress' | 'onDownload' | 'onUpdate' | 'onRemove'
>;

export default function PackageSidebarActionsCard({
  item,
  canInstall,
  busyAction,
  isBusy,
  progress,
  onDownload,
  onUpdate,
  onRemove,
}: PackageSidebarActionsCardProps) {
  const downloading = busyAction === 'download';
  const updating = busyAction === 'update';
  const removing = busyAction === 'remove';
  const primaryDisabled = isBusy || !canInstall;

  return (
    <div className={cn(surface.cardSection, 'space-y-3')}>
      {item.installed ? (
        <>
          {item.isLatest ? (
            <Badge variant="success" shape="pill" size="sm" className={cn(layout.inlineGap2, 'font-bold')}>
              <CheckCircle2 size={14} /> 最新{item.installedVersion ? `（${item.installedVersion}）` : ''}
            </Badge>
          ) : (
            <button
              className={cn(
                layout.center,
                'h-10 px-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-sm font-bold rounded-lg transition-colors gap-2 w-full cursor-pointer disabled:cursor-not-allowed',
              )}
              onClick={() => void onUpdate()}
              disabled={primaryDisabled}
              type="button"
            >
              {updating ? (
                <span className={layout.inlineGap2}>
                  <ProgressCircle
                    value={progress.ratio}
                    size={20}
                    strokeWidth={3}
                    className="text-amber-600 dark:text-amber-400"
                    ariaLabel={`${progress.label} ${progress.percent}%`}
                  />
                  {progress.label} {`${progress.percent}%`}
                </span>
              ) : (
                <>
                  <RefreshCw size={18} /> 更新
                </>
              )}
            </button>
          )}
          {!updating ? (
            <Button
              variant="danger"
              size="default"
              radius="xl"
              className="w-full cursor-pointer disabled:cursor-not-allowed"
              onClick={() => void onRemove()}
              disabled={isBusy}
              type="button"
            >
              {removing ? (
                '削除中…'
              ) : (
                <>
                  <Trash2 size={18} /> 削除
                </>
              )}
            </Button>
          ) : null}
        </>
      ) : (
        <Button
          variant="primary"
          size="default"
          radius="xl"
          className="w-full cursor-pointer disabled:cursor-not-allowed"
          onClick={() => void onDownload()}
          disabled={primaryDisabled}
          type="button"
        >
          {downloading ? (
            <span className={layout.inlineGap2}>
              <ProgressCircle
                value={progress.ratio}
                size={20}
                strokeWidth={3}
                ariaLabel={`${progress.label} ${progress.percent}%`}
              />
              {progress.label} {`${progress.percent}%`}
            </span>
          ) : (
            <>
              <Download size={18} /> インストール
            </>
          )}
        </Button>
      )}
    </div>
  );
}
