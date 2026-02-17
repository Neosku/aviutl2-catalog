import React, { useMemo } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PackageHeaderSectionProps } from '../types';

export default function PackageHeaderSection({ item, listLink, heroImage }: PackageHeaderSectionProps) {
  const heroImageStyle = useMemo(() => ({ backgroundImage: `url(${heroImage})` }), [heroImage]);

  return (
    <>
      <nav className="flex items-center text-sm text-slate-500 dark:text-slate-400">
        <Link to={listLink} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
          パッケージ一覧
        </Link>
        <ChevronRight size={16} className="mx-2" />
        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{item.name}</span>
      </nav>

      <section
        className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${heroImage ? 'min-h-[160px]' : ''}`}
      >
        {heroImage ? (
          <div className="absolute inset-0 bg-cover bg-center opacity-25" style={heroImageStyle} aria-hidden />
        ) : null}
        <div className="relative p-6 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {item.type || '未分類'}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.name}</h1>
              {item.summary ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{item.summary}</p>
              ) : null}
            </div>
            {item.installed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle2 size={14} /> 導入済
              </span>
            ) : null}
          </div>

          {item.tags?.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
