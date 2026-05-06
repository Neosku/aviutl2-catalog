import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadMarkdown } from '@/utils/catalogClient';
import type { UpdatesItem } from '../../model/types';
import { buildRelevantChangelogHtml } from '../../model/changelog';

export interface UpdatesChangelogEntry {
  html: string;
  loading: boolean;
  error: string;
  empty: boolean;
}

export default function useUpdatesChangelog(items: UpdatesItem[]) {
  const { t } = useTranslation('updates');
  const [entries, setEntries] = useState<Record<string, UpdatesChangelogEntry>>({});

  const normalizedItems = useMemo(
    () =>
      items.filter((item) => {
        const source = item.changelog?.markdownSource;
        return typeof source === 'string' && source.trim();
      }),
    [items],
  );

  useEffect(() => {
    let cancelled = false;
    const targetIds = new Set(normalizedItems.map((item) => item.id));

    setEntries((prev) => {
      const next: Record<string, UpdatesChangelogEntry> = {};
      Object.entries(prev).forEach(([id, value]) => {
        if (targetIds.has(id)) {
          next[id] = value;
        }
      });
      normalizedItems.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = { html: '', loading: true, error: '', empty: false };
        }
      });
      return next;
    });

    normalizedItems.forEach((item) => {
      const source = item.changelog?.markdownSource?.trim();
      if (!source) return;

      void (async () => {
        try {
          const markdown = await loadMarkdown(source, '');
          const html = await buildRelevantChangelogHtml(item, markdown, source);
          if (cancelled) return;
          setEntries((prev) => ({
            ...prev,
            [item.id]: {
              html,
              loading: false,
              error: '',
              empty: !html,
            },
          }));
        } catch {
          if (cancelled) return;
          setEntries((prev) => ({
            ...prev,
            [item.id]: {
              html: '',
              loading: false,
              error: t('changelog.loadFailed'),
              empty: false,
            },
          }));
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedItems, t]);

  return entries;
}
