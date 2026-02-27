/**
 * バージョン配下のファイルカードコンポーネント
 * ハッシュ計算やパス入力を行う
 */
import React, { memo } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { FileSearch } from 'lucide-react';
import type { VersionFileCardProps } from '../types';
import DeleteButton from '../components/DeleteButton';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const hashMetaLabelClass = 'font-semibold text-slate-500 dark:text-slate-400';

const VersionFileCard = memo(
  function VersionFileCard({
    versionKey,
    file,
    index,
    removeVersionFile,
    updateVersionFile,
    chooseFileForHash,
  }: VersionFileCardProps) {
    const order = index + 1;
    return (
      <div
        className={cn(
          surface.panelLgSubtle,
          'group relative space-y-3 p-4 transition hover:bg-slate-100/50 dark:bg-slate-900/50 dark:hover:bg-slate-900',
        )}
      >
        <div className={layout.rowBetweenGap2}>
          <Badge
            variant="outlineNeutral"
            shape="rounded"
            size="sm"
            className="bg-white px-2 py-1 font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            File {order}
          </Badge>
          <DeleteButton onClick={() => removeVersionFile(versionKey, file.key)} ariaLabel={`ファイル${order}を削除`} />
        </div>
        <div className="space-y-1">
          <label className={text.labelXs} htmlFor={`version-${versionKey}-file-${file.key}-path`}>
            保存先パス (インストール時)
          </label>
          <input
            id={`version-${versionKey}-file-${file.key}-path`}
            value={file.path}
            onChange={(e) => updateVersionFile(versionKey, file.key, 'path', e.target.value)}
            placeholder="{pluginsDir}/plugin.dll"
            className="!bg-white dark:!bg-slate-800"
          />
        </div>
        <div className={cn(surface.panelLg, 'p-3 dark:border-slate-800 dark:bg-slate-800/50')}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <dl className="grid gap-1 text-xs">
              <div>
                <dt className={hashMetaLabelClass}>ハッシュ値 (XXH3_128)</dt>
                <dd
                  className={cn(
                    'font-mono',
                    file.hash ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-500',
                  )}
                >
                  {file.hash ? file.hash : '未計算'}
                </dd>
              </div>
              {file.fileName && (
                <div className="mt-1">
                  <dt className={hashMetaLabelClass}>元ファイル名</dt>
                  <dd className="text-slate-600 dark:text-slate-300">{file.fileName}</dd>
                </div>
              )}
            </dl>
            <Button
              variant="muted"
              size="compact"
              type="button"
              onClick={() => chooseFileForHash(versionKey, file.key)}
            >
              <FileSearch size={14} />
              <span>ファイルを選択して計算</span>
            </Button>
          </div>
        </div>
      </div>
    );
  },
  (prev: Readonly<VersionFileCardProps>, next: Readonly<VersionFileCardProps>) =>
    prev.file === next.file &&
    prev.index === next.index &&
    prev.versionKey === next.versionKey &&
    prev.removeVersionFile === next.removeVersionFile &&
    prev.updateVersionFile === next.updateVersionFile &&
    prev.chooseFileForHash === next.chooseFileForHash,
);

export default VersionFileCard;
