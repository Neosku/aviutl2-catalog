/**
 * バージョン配下のファイルカードコンポーネント
 * ハッシュ計算やパス入力を行う
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('register');
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
            {t('versions.fileLabel', { count: order })}
          </Badge>
          <DeleteButton
            onClick={() => removeVersionFile(versionKey, file.key)}
            ariaLabel={t('versions.deleteFile', { count: order })}
          />
        </div>
        <div className="space-y-1">
          <label className={text.labelXs} htmlFor={`version-${versionKey}-file-${file.key}-path`}>
            {t('versions.pathLabel')}
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
                <dt className={hashMetaLabelClass}>{t('versions.hashLabel')}</dt>
                <dd
                  className={cn(
                    'font-mono',
                    file.xxh128 ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-500',
                  )}
                >
                  {file.xxh128 ? file.xxh128 : t('versions.hashMissing')}
                </dd>
              </div>
              {file.fileName && (
                <div className="mt-1">
                  <dt className={hashMetaLabelClass}>{t('versions.sourceFile')}</dt>
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
              <span>{t('versions.chooseAndHash')}</span>
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
