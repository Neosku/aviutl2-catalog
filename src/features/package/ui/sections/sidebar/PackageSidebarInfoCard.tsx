import React, { useMemo } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Calendar, ExternalLink, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HOME_SEARCH_RESTORE_STATE } from '../../../../../layouts/app-shell/types';
import { buildPackageListSearch } from '../../../model/helpers';
import type { PackageSidebarSectionProps } from '../../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

type PackageSidebarInfoCardProps = Pick<
  PackageSidebarSectionProps,
  'item' | 'updated' | 'latest' | 'renderableLicenses' | 'licenseTypesLabel' | 'onOpenLicense'
>;

export default function PackageSidebarInfoCard({
  item,
  updated,
  latest,
  renderableLicenses,
  licenseTypesLabel,
  onOpenLicense,
}: PackageSidebarInfoCardProps) {
  const authorLink = useMemo(() => {
    const author = String(item.author || '').trim();
    if (!author) return null;
    const search = buildPackageListSearch('', { q: author, tags: [] });
    return search ? `/${search}` : '/';
  }, [item.author]);

  const tagLinks = useMemo(
    () =>
      (item.tags || []).map((tag) => ({
        tag,
        to: (() => {
          const search = buildPackageListSearch('', { q: '', tags: [tag] });
          return search ? `/${search}` : '/';
        })(),
      })),
    [item.tags],
  );

  return (
    <div className={cn(surface.cardSection, 'space-y-4')}>
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>作者</span>
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
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>更新日</span>
        <span className={cn(layout.inlineGap2, 'text-slate-800 dark:text-slate-200')}>
          <Calendar size={14} />
          {updated}
        </span>
      </div>
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>最新バージョン</span>
        <span className="text-slate-800 dark:text-slate-200">{latest}</span>
      </div>
      {item.installedVersion ? (
        <div className={cn(layout.rowBetween, text.bodySmMuted)}>
          <span>現在のバージョン</span>
          <span className="text-slate-800 dark:text-slate-200">{item.installedVersion}</span>
        </div>
      ) : null}
      {item.niconiCommonsId ? (
        <div className={cn(layout.rowBetween, text.bodySmMuted)}>
          <span>ニコニコモンズID</span>
          <span className="text-slate-800 dark:text-slate-200 font-mono">{item.niconiCommonsId}</span>
        </div>
      ) : null}
      {item.tags?.length ? (
        <div className="space-y-2">
          <span className={text.bodySmMuted}>タグ</span>
          <div className={layout.wrapGap2}>
            {tagLinks.map(({ tag, to }) => (
              <Link key={tag} to={to} state={HOME_SEARCH_RESTORE_STATE} className="inline-flex">
                <Badge
                  variant="outlineNeutral"
                  shape="pill"
                  size="sm"
                  className="px-2 py-1 normal-case hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  #{tag}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <span className={text.bodySmMuted}>ライセンス</span>
        <div className={layout.wrapGap2}>
          {renderableLicenses.length ? (
            renderableLicenses.map((license) => (
              <Button
                variant="secondary"
                size="chip"
                radius="full"
                key={license.key}
                className="text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                onClick={() => onOpenLicense(license)}
                aria-label={`ライセンス ${license.type || '不明'} の本文を表示`}
              >
                {license.type || '不明'}
              </Button>
            ))
          ) : (
            <span className={text.mutedXs}>{licenseTypesLabel}</span>
          )}
        </div>
      </div>
      {item.repoURL ? (
        <a
          className={cn(layout.inlineGap2, 'text-sm text-blue-600 hover:underline dark:text-blue-400 break-all')}
          href={item.repoURL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} className="shrink-0" /> {item.repoURL}
        </a>
      ) : null}
    </div>
  );
}
