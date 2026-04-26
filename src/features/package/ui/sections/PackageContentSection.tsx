import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PackageCard from '@/components/package-card/PackageCard';
import ImageCarousel from '../components/ImageCarousel';
import type { PackageContentSectionProps } from '../types';
import { surface, text } from '@/components/ui/_styles';
import { TriangleAlert } from 'lucide-react';

const sectionTitleClass = 'text-lg font-bold mb-2';

function resolveAnchorHref(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  const link = target.closest('a[href]');
  if (!(link instanceof HTMLAnchorElement)) return '';
  return link.href || '';
}

export default function PackageContentSection({
  item,
  carouselImages,
  detailError,
  description,
  notice,
  changelog,
  relationSections,
  relationsLoading,
  relationsError,
  onOpenLink,
}: PackageContentSectionProps) {
  const { t } = useTranslation('package');
  const descriptionMarkup = useMemo(() => ({ __html: description.html }), [description.html]);
  const noticeMarkup = useMemo(() => ({ __html: notice.html }), [notice.html]);
  const changelogMarkup = useMemo(() => ({ __html: changelog.html }), [changelog.html]);
  const hasRelations = relationSections.length > 0 || relationsLoading || Boolean(relationsError);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const changelogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const refs = [descriptionRef, noticeRef, changelogRef];
    const cleanups = refs
      .map((ref) => {
        const element = ref.current;
        if (!element) return null;

        const handleClick = (event: MouseEvent) => {
          const href = resolveAnchorHref(event.target);
          if (!href) return;
          event.preventDefault();
          void onOpenLink(href);
        };

        element.addEventListener('click', handleClick);
        return () => {
          element.removeEventListener('click', handleClick);
        };
      })
      .filter(Boolean);

    return () => {
      cleanups.forEach((cleanup) => cleanup?.());
    };
  }, [changelog.html, description.html, notice.html, onOpenLink]);

  return (
    <div className="space-y-6">
      {detailError ? (
        <section className={surface.cardSection}>
          <p className="error" role="alert">
            {detailError}
          </p>
        </section>
      ) : null}

      {carouselImages.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t('content.screenshots')}</h2>
          <ImageCarousel images={carouselImages} />
        </section>
      ) : null}

      <section className={surface.cardSection}>
        <h2 className={sectionTitleClass}>{t('common:labels.summary')}</h2>
        <p className="select-text text-base leading-7 text-slate-600 dark:text-slate-300">{item.summary || '?'}</p>
        {item.deprecation ? (
          <>
            <h3 className="text-sm font-bold text-yellow-600 dark:text-yellow-300 mt-4 mb-2 justify-center">
              <TriangleAlert className="inline text-yellow-600 dark:text-yellow-300 mr-1" />
              {t('content.deprecated')}
            </h3>
            {item.deprecation.message ? (
              <>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">{t('content.deprecatedReason')}</p>
                <blockquote className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-500 text-sm text-yellow-600 dark:text-yellow-300 rounded">
                  {item.deprecation.message}
                </blockquote>
              </>
            ) : (
              <p className="text-sm text-yellow-600 dark:text-yellow-300">{t('content.deprecatedSimple')}</p>
            )}
          </>
        ) : null}
      </section>

      {description.loading || description.html || description.error ? (
        <section className={surface.cardSection}>
          <h2 className="text-lg font-bold mb-3">{t('common:labels.description')}</h2>
          {description.loading ? (
            <p className={text.mutedSm}>{t('content.descriptionLoading')}</p>
          ) : (
            <div
              ref={descriptionRef}
              className="prose prose-slate max-w-none dark:prose-invert select-text"
              dangerouslySetInnerHTML={descriptionMarkup}
            />
          )}
          {description.error ? (
            <p className="error mt-3" role="alert">
              {description.error}
            </p>
          ) : null}
        </section>
      ) : null}

      {notice.loading || notice.html || notice.error ? (
        <section className={surface.cardSection}>
          <h2 className={sectionTitleClass}>{t('content.notice')}</h2>
          {notice.loading ? (
            <p className={text.mutedSm}>{t('content.noticeLoading')}</p>
          ) : (
            <div
              ref={noticeRef}
              className="prose prose-slate max-w-none dark:prose-invert select-text"
              dangerouslySetInnerHTML={noticeMarkup}
            />
          )}
          {notice.error ? (
            <p className="error mt-3" role="alert">
              {notice.error}
            </p>
          ) : null}
        </section>
      ) : null}

      {changelog.loading || changelog.html || changelog.error ? (
        <section className={surface.cardSection}>
          <h2 className={sectionTitleClass}>{t('content.changelog')}</h2>
          {changelog.loading ? (
            <p className={text.mutedSm}>{t('content.changelogLoading')}</p>
          ) : changelog.html ? (
            <div
              ref={changelogRef}
              className="prose prose-slate max-w-none dark:prose-invert select-text"
              dangerouslySetInnerHTML={changelogMarkup}
            />
          ) : (
            <p className={text.mutedSm}>{t('content.changelogEmpty')}</p>
          )}
          {changelog.error ? (
            <p className="error mt-3" role="alert">
              {changelog.error}
            </p>
          ) : null}
        </section>
      ) : null}

      {hasRelations ? (
        <section className={surface.cardSection}>
          <h2 className={sectionTitleClass}>{t('content.relations')}</h2>
          {relationsLoading ? <p className={text.mutedSm}>{t('content.relationsLoading')}</p> : null}
          {relationsError ? (
            <p className="error mb-3" role="alert">
              {relationsError}
            </p>
          ) : null}
          <div className="space-y-6">
            {relationSections.map((section) => (
              <div key={section.key} className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {t(`relations.${section.key}`)}
                </h3>
                {section.items.length ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {section.items.map((relatedItem) => (
                      <PackageCard key={`${section.key}:${relatedItem.id}`} item={relatedItem} />
                    ))}
                  </div>
                ) : null}
                {section.missingIds.length ? (
                  <p className={text.bodySmMuted}>
                    {t('relations.missingPackages', { ids: section.missingIds.join(', ') })}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
