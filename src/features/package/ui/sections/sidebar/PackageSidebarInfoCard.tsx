import React from 'react';
import Button from '@/components/ui/Button';
import { Calendar, ExternalLink, User } from 'lucide-react';
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
  return (
    <div className={cn(surface.cardSection, 'space-y-4')}>
      <div className={cn(layout.rowBetween, text.bodySmMuted)}>
        <span>作者</span>
        <span className={cn(layout.inlineGap2, 'text-slate-800 dark:text-slate-200')}>
          <User size={14} />
          {item.author || '?'}
        </span>
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
