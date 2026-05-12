import { useMemo } from 'react';
import Button from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/Button';
import { Calendar, ExternalLink, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HOME_SEARCH_RESTORE_STATE } from '@/layouts/app-shell/types';
import { getInstalledVersionLabel } from '@/utils/detectResult';
import { buildPackageListSearch, resolvePackageTypeLabel } from '../../../model/helpers';
import type { PackageSidebarSectionProps } from '../../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

type PackageSidebarInfoCardProps = Pick<
  PackageSidebarSectionProps,
  | 'item'
  | 'updated'
  | 'latest'
  | 'originalAuthor'
  | 'packagePageUrl'
  | 'hasNotice'
  | 'noticeLoading'
  | 'renderableLicenses'
  | 'licenseTypesLabel'
  | 'onOpenNotice'
  | 'onOpenLicense'
>;

const detailMetaChipVariant = { variant: 'secondary', size: 'chip', radius: 'full' } as const;
const detailMetaChipClassName =
  'text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400 cursor-pointer';

export default function PackageSidebarInfoCard({
  item,
  updated,
  latest,
  originalAuthor,
  packagePageUrl,
  hasNotice,
  noticeLoading,
  renderableLicenses,
  licenseTypesLabel,
  onOpenNotice,
  onOpenLicense,
}: PackageSidebarInfoCardProps) {
  const { t } = useTranslation('package');
  const packageTypeLabel = resolvePackageTypeLabel(item.packageType, t, '?', item.typeLabel);
  const installedVersionLabel = getInstalledVersionLabel(
    item.installedVersion,
    item.detectedResult,
    t('sidebar.versionUnknown'),
  );
  const authorLink = useMemo(() => {
    const author = String(item.author || '').trim();
    if (!author) return null;
    const search = buildPackageListSearch('', { q: author, tags: [] });
    return search ? `/${search}` : '/';
  }, [item.author]);

  const tagLinks = useMemo(
    () =>
      item.tags.map((tag) => {
        const search = buildPackageListSearch('', { q: '', tags: [tag] });
        return {
          tag,
          to: search ? `/${search}` : '/',
        };
      }),
    [item.tags],
  );

  return (
    <div className={cn(surface.cardSection, 'space-y-4')}>
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>{t('common:labels.id')}</span>
        <span className="text-slate-800 dark:text-slate-200 font-mono select-text">{item.id}</span>
      </div>
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>{t('common:labels.author')}</span>
        {authorLink ? (
          <Link
            to={authorLink}
            state={HOME_SEARCH_RESTORE_STATE}
            className={cn(
              layout.inlineGap2,
              'text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline-offset-2 hover:underline',
            )}
          >
            <User size={14} />
            {item.author}
          </Link>
        ) : (
          <span className={cn(layout.inlineGap2, 'text-slate-800 dark:text-slate-200')}>
            <User size={14} />?
          </span>
        )}
      </div>
      {originalAuthor ? (
        <div className={cn(layout.rowBetween, text.bodySmMuted)}>
          <span>{t('sidebar.originalAuthor')}</span>
          <span className="text-slate-800 dark:text-slate-200">{originalAuthor}</span>
        </div>
      ) : null}
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>{t('common:labels.type')}</span>
        <span className="text-slate-800 dark:text-slate-200">{packageTypeLabel}</span>
      </div>
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>{t('sidebar.updatedAt')}</span>
        <span className={cn(layout.inlineGap2, 'text-slate-800 dark:text-slate-200')}>
          <Calendar size={14} />
          {updated}
        </span>
      </div>
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>{t('sidebar.latestVersion')}</span>
        <span className="text-slate-800 dark:text-slate-200">{latest}</span>
      </div>
      {hasNotice ? (
        <div className={cn(layout.rowBetween, text.bodySmMuted)}>
          <span>{t('content.notice')}</span>
          <Button
            type="button"
            variant={detailMetaChipVariant.variant}
            size={detailMetaChipVariant.size}
            radius={detailMetaChipVariant.radius}
            className={detailMetaChipClassName}
            onClick={onOpenNotice}
            disabled={noticeLoading}
            aria-label={t('sidebar.openNoticeAria')}
          >
            {noticeLoading ? t('content.noticeLoading') : t('sidebar.openNotice')}
          </Button>
        </div>
      ) : null}
      {item.installed && installedVersionLabel ? (
        <div className={cn(layout.rowBetween, text.bodySmMuted)}>
          <span>{t('sidebar.currentVersion')}</span>
          <span className="text-slate-800 dark:text-slate-200">{installedVersionLabel}</span>
        </div>
      ) : null}
      {item.niconiCommonsId ? (
        <div className={cn(layout.rowBetween, text.bodySmMuted)}>
          <span>{t('common:labels.niconiCommonsId')}</span>
          <span className="text-slate-800 dark:text-slate-200 font-mono select-text">{item.niconiCommonsId}</span>
        </div>
      ) : null}
      {item.tags?.length ? (
        <div className="space-y-2">
          <span className={text.bodySmMuted}>{t('common:labels.tags')}</span>
          <div className={layout.wrapGap2}>
            {tagLinks.map(({ tag, to }) => (
              <Link
                key={tag}
                to={to}
                state={HOME_SEARCH_RESTORE_STATE}
                className={cn(buttonVariants(detailMetaChipVariant), detailMetaChipClassName)}
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <span className={text.bodySmMuted}>{t('common:labels.licenses')}</span>
        <div className={layout.wrapGap2}>
          {renderableLicenses.length ? (
            renderableLicenses.map((license) => (
              <Button
                variant={detailMetaChipVariant.variant}
                size={detailMetaChipVariant.size}
                radius={detailMetaChipVariant.radius}
                key={license.key}
                className={detailMetaChipClassName}
                onClick={() => onOpenLicense(license)}
                aria-label={t('sidebar.openLicenseAria', { type: license.type || t('sidebar.licenseUnknown') })}
              >
                {license.type || t('sidebar.licenseUnknown')}
              </Button>
            ))
          ) : (
            <span className={text.mutedXs}>{licenseTypesLabel}</span>
          )}
        </div>
      </div>
      {packagePageUrl ? (
        <a
          className={cn(layout.inlineGap2, 'text-sm text-blue-600 hover:underline dark:text-blue-400 break-all')}
          href={packagePageUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} className="shrink-0" /> {t('sidebar.packagePage')}
        </a>
      ) : null}
    </div>
  );
}
