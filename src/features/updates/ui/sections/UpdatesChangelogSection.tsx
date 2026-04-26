import { useMemo } from 'react';
import type { UpdatesItem } from '../../model/types';
import type { UpdatesChangelogEntry } from '../hooks/useUpdatesChangelog';
import { surface, text } from '@/components/ui/_styles';

interface UpdatesChangelogSectionProps {
  items: UpdatesItem[];
  changelogEntries: Record<string, UpdatesChangelogEntry>;
  title: string;
  emptyMessage: string;
  loadingMessage: string;
}

function UpdatesChangelogBody({ html }: { html: string }) {
  const markup = useMemo(() => ({ __html: html }), [html]);
  return <div className="prose prose-slate max-w-none dark:prose-invert" dangerouslySetInnerHTML={markup} />;
}

export default function UpdatesChangelogSection({
  items,
  changelogEntries,
  title,
  emptyMessage,
  loadingMessage,
}: UpdatesChangelogSectionProps) {
  if (items.length === 0) {
    return (
      <section className={surface.panel}>
        <h3 className="text-base font-bold">{title}</h3>
        <p className={text.emptyStateMuted}>{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-base font-bold">{title}</h3>
      <div className="space-y-4">
        {items.map((item) => {
          const entry = changelogEntries[item.id];
          return (
            <article key={item.id} className={surface.cardSection}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.name}</h4>
                  <p className={text.mutedXs}>
                    {item.installedVersion || '?'} {'->'} {item.latestVersion || '?'}
                  </p>
                </div>
              </div>
              {entry?.loading ? <p className={text.mutedSm}>{loadingMessage}</p> : null}
              {entry?.error ? (
                <p className="error" role="alert">
                  {entry.error}
                </p>
              ) : null}
              {entry && !entry.loading && !entry.error && entry.empty ? <p className={text.mutedSm}>{emptyMessage}</p> : null}
              {entry?.html ? <UpdatesChangelogBody html={entry.html} /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
