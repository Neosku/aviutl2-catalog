import React from 'react';
import { Calendar, ExternalLink, User } from 'lucide-react';
import type { PackageSidebarSectionProps } from '../../types';

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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>作者</span>
        <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <User size={14} />
          {item.author || '?'}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>更新日</span>
        <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <Calendar size={14} />
          {updated}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>最新バージョン</span>
        <span className="text-slate-800 dark:text-slate-200">{latest}</span>
      </div>
      {item.installedVersion ? (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>現在のバージョン</span>
          <span className="text-slate-800 dark:text-slate-200">{item.installedVersion}</span>
        </div>
      ) : null}
      {item.niconiCommonsId ? (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>ニコニコモンズID</span>
          <span className="text-slate-800 dark:text-slate-200 font-mono">{item.niconiCommonsId}</span>
        </div>
      ) : null}
      <div className="space-y-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">ライセンス</span>
        <div className="flex flex-wrap gap-2">
          {renderableLicenses.length ? (
            renderableLicenses.map((license) => (
              <button
                type="button"
                key={license.key}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                onClick={() => onOpenLicense(license)}
                aria-label={`ライセンス ${license.type || '不明'} の本文を表示`}
              >
                {license.type || '不明'}
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">{licenseTypesLabel}</span>
          )}
        </div>
      </div>
      {item.repoURL ? (
        <a
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400 break-all"
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
