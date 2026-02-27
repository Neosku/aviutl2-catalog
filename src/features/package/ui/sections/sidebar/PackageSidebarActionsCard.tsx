import React from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { CheckCircle2, Download, RefreshCw, Trash2 } from 'lucide-react';
import ProgressCircle from '../../../../../components/ProgressCircle';
import type { PackageSidebarSectionProps } from '../../types';
import { cn } from '@/lib/cn';
import { layout, surface } from '@/components/ui/_styles';

type PackageSidebarActionsCardProps = Pick<
  PackageSidebarSectionProps,
  | 'item'
  | 'canInstall'
  | 'downloading'
  | 'updating'
  | 'removing'
  | 'downloadProgress'
  | 'updateProgress'
  | 'onDownload'
  | 'onUpdate'
  | 'onRemove'
>;

export default function PackageSidebarActionsCard({
  item,
  canInstall,
  downloading,
  updating,
  removing,
  downloadProgress,
  updateProgress,
  onDownload,
  onUpdate,
  onRemove,
}: PackageSidebarActionsCardProps) {
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
                'h-10 px-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-sm font-bold rounded-lg transition-colors gap-2 w-full',
              )}
              onClick={() => void onUpdate()}
              disabled={!canInstall || updating}
              type="button"
            >
              {updating ? (
                <span className={layout.inlineGap2}>
                  <ProgressCircle
                    value={updateProgress.ratio}
                    size={20}
                    strokeWidth={3}
                    className="text-amber-600 dark:text-amber-400"
                    ariaLabel={`${updateProgress.label} ${updateProgress.percent}%`}
                  />
                  {updateProgress.label} {`${updateProgress.percent}%`}
                </span>
              ) : (
                <>
                  <RefreshCw size={18} /> 更新
                </>
              )}
            </button>
          )}
          <Button
            variant="danger"
            size="default"
            radius="xl"
            className="w-full"
            onClick={() => void onRemove()}
            disabled={removing}
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
        </>
      ) : (
        <Button
          variant="primary"
          size="default"
          radius="xl"
          className="w-full"
          onClick={() => void onDownload()}
          disabled={!canInstall || downloading}
          type="button"
        >
          {downloading ? (
            <span className={layout.inlineGap2}>
              <ProgressCircle
                value={downloadProgress.ratio}
                size={20}
                strokeWidth={3}
                ariaLabel={`${downloadProgress.label} ${downloadProgress.percent}%`}
              />
              {downloadProgress.label} {`${downloadProgress.percent}%`}
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
