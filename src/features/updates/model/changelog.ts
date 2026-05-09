import type { UpdatesItem } from './types';
import { escapeHtml } from '@/utils/escapeHtml';

const VERSION_HEADING_RE = /^##\s+([^\s#\n]+)(?:\s+\(([^)\n]+)\)|\s+([0-9]{4}-[0-9]{2}-[0-9]{2}))?.*$/gm;

export interface RenderedChangelogSection {
  version: string;
  date: string;
  html: string;
}

export async function buildRelevantChangelogHtml(
  item: UpdatesItem,
  markdown: string,
  sourceUrl: string,
): Promise<string> {
  const sections = await buildRelevantChangelogSections(item, markdown, sourceUrl);
  return sections
    .map((section) => {
      if (!section.version) return section.html;
      const date = section.date ? ` (${escapeHtml(section.date)})` : '';
      return `<h2>${escapeHtml(section.version)}${date}</h2>\n${section.html}`;
    })
    .join('\n');
}

export async function buildRelevantChangelogSections(
  item: UpdatesItem,
  markdown: string,
  sourceUrl: string,
): Promise<RenderedChangelogSection[]> {
  const sections = sliceRelevantChangelogMarkdownWithMeta(item, markdown);
  const { renderMarkdown } = await import('@/utils/markdown');

  return Promise.all(
    sections.map(async (section) => {
      if (!section.version) {
        return {
          version: '',
          date: '',
          html: await renderMarkdown(section.markdown, { baseUrl: sourceUrl }),
        };
      }

      // Strip the heading line from markdown and render content manually.
      const lines = section.markdown.split('\n');
      const contentToRender = lines.slice(1).join('\n').trim();

      const html = await renderMarkdown(contentToRender, { baseUrl: sourceUrl });
      return {
        version: section.version,
        date: section.date,
        html,
      };
    }),
  );
}

interface ChangelogSection {
  version: string;
  date: string;
  markdown: string;
}

export function sliceRelevantChangelogMarkdownWithMeta(item: UpdatesItem, markdown: string): ChangelogSection[] {
  const rawMarkdown = typeof markdown === 'string' ? markdown.trim() : '';
  if (!rawMarkdown) {
    return [];
  }

  const versions = Array.isArray(item.versions) ? item.versions : [];
  const knownVersions = new Set(versions.map((entry) => String(entry.version || '').trim()).filter(Boolean));
  if (knownVersions.size === 0) {
    return [{ version: '', date: '', markdown: rawMarkdown }];
  }

  const installedVersion = typeof item.installedVersion === 'string' ? item.installedVersion.trim() : '';
  const installedIndex = versions.findIndex((entry) => entry.version === installedVersion);
  const targetVersionEntries = installedIndex < 0 ? versions.slice(-1) : versions.slice(installedIndex + 1);
  const targetVersions = new Set(
    targetVersionEntries.map((entry) => String(entry.version || '').trim()).filter(Boolean),
  );
  if (targetVersions.size === 0) {
    return [];
  }

  const matches = Array.from(rawMarkdown.matchAll(VERSION_HEADING_RE))
    .map((match) => ({
      version: match[1],
      date: match[2] || match[3] || '',
      index: match.index ?? 0,
    }))
    .filter((entry) => knownVersions.has(entry.version));

  if (matches.length === 0) {
    return [{ version: '', date: '', markdown: rawMarkdown }];
  }

  return matches
    .map((match, index) => {
      const nextIndex = matches[index + 1]?.index ?? rawMarkdown.length;
      return {
        version: match.version,
        date: match.date,
        markdown: rawMarkdown.slice(match.index, nextIndex).trim(),
      };
    })
    .filter((section) => targetVersions.has(section.version) && section.markdown);
}

export function sliceRelevantChangelogMarkdown(item: UpdatesItem, markdown: string): string {
  const sections = sliceRelevantChangelogMarkdownWithMeta(item, markdown);
  return sections.map((s) => s.markdown).join('\n\n');
}
