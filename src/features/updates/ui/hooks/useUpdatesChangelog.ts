import { useEffect, useMemo, useState } from 'react';
import { loadMarkdown } from '@/utils/catalogClient';
import type { UpdatesItem } from '../../model/types';
import { buildRelevantChangelogSections, type RenderedChangelogSection } from '../../model/changelog';

export interface UpdatesChangelogEntry {
  sections: RenderedChangelogSection[];
}

export default function useUpdatesChangelog(items: UpdatesItem[]) {
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
          next[item.id] = { sections: [] };
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
          const sections = await buildRelevantChangelogSections(item, markdown, source);
          if (cancelled) return;
          setEntries((prev) => ({
            ...prev,
            [item.id]: {
              sections,
            },
          }));
        } catch {
          if (cancelled) return;
          setEntries((prev) => ({
            ...prev,
            [item.id]: {
              sections: [],
            },
          }));
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedItems]);

  return entries;
}
