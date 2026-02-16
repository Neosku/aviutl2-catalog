import React, { useMemo } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import ImageCarousel from '../../../../components/ImageCarousel.jsx';
import type { PackageContentSectionProps } from '../types';

function resolveAnchorHref(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  const link = target.closest('a[href]');
  if (!(link instanceof HTMLAnchorElement)) return '';
  return link.href || '';
}

export default function PackageContentSection({
  item,
  carouselImages,
  descriptionHtml,
  descriptionLoading,
  descriptionError,
  onOpenLink,
}: PackageContentSectionProps) {
  const descriptionMarkup = useMemo(() => ({ __html: descriptionHtml }), [descriptionHtml]);

  const handleDescriptionClick = (event: MouseEvent<HTMLDivElement>) => {
    const href = resolveAnchorHref(event.target);
    if (!href) return;
    event.preventDefault();
    void onOpenLink(href);
  };

  const handleDescriptionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const href = resolveAnchorHref(event.target);
    if (!href) return;
    event.preventDefault();
    void onOpenLink(href);
  };

  return (
    <div className="space-y-6">
      {carouselImages.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">スクリーンショット</h2>
          <ImageCarousel images={carouselImages} />
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold mb-2">概要</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{item.summary || '?'}</p>
      </section>

      {item.description ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold mb-3">詳細説明</h2>
          {descriptionLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">詳細説明を読み込み中です…</p>
          ) : (
            <div
              className="prose prose-slate max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={descriptionMarkup}
              onClick={handleDescriptionClick}
              onKeyDown={handleDescriptionKeyDown}
            />
          )}
          {descriptionError ? (
            <p className="error mt-3" role="alert">
              {descriptionError}
            </p>
          ) : null}
        </section>
      ) : null}

      {item.dependencies?.length ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold mb-2">依存関係</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{item.dependencies.join(', ')}</p>
        </section>
      ) : null}
    </div>
  );
}
