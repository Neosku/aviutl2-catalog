import type { UpdatesItem } from './types';

const VERSION_HEADING_RE = /^##\s+([^\s#]+).*$/gm;

export async function buildRelevantChangelogHtml(
  item: UpdatesItem,
  markdown: string,
  sourceUrl: string,
): Promise<string> {
  const slicedMarkdown = sliceRelevantChangelogMarkdown(item, markdown);
  const { renderMarkdown } = await import('@/utils/markdown');
  return renderMarkdown(slicedMarkdown, { baseUrl: sourceUrl });
}

export function sliceRelevantChangelogMarkdown(item: UpdatesItem, markdown: string): string {
  const rawMarkdown = typeof markdown === 'string' ? markdown.trim() : '';
  if (!rawMarkdown) {
    return '';
  }

  const versions = Array.isArray(item.versions) ? item.versions : [];
  const knownVersions = new Set(versions.map((entry) => String(entry.version || '').trim()).filter(Boolean));
  if (knownVersions.size === 0) {
    return rawMarkdown;
  }

  const installedVersion = typeof item.installedVersion === 'string' ? item.installedVersion.trim() : '';
  const installedIndex = versions.findIndex((entry) => entry.version === installedVersion);
  if (installedIndex < 0) {
    return rawMarkdown;
  }

  const targetVersions = new Set(
    versions
      .slice(installedIndex + 1)
      .map((entry) => String(entry.version || '').trim())
      .filter(Boolean),
  );
  if (targetVersions.size === 0) {
    return '';
  }

  const matches = Array.from(rawMarkdown.matchAll(VERSION_HEADING_RE))
    .map((match) => ({
      version: match[1],
      index: match.index ?? 0,
    }))
    .filter((entry) => knownVersions.has(entry.version));

  if (matches.length === 0) {
    return rawMarkdown;
  }

  const sections = matches
    .map((match, index) => {
      const nextIndex = matches[index + 1]?.index ?? rawMarkdown.length;
      return {
        version: match.version,
        markdown: rawMarkdown.slice(match.index, nextIndex).trim(),
      };
    })
    .filter((section) => targetVersions.has(section.version) && section.markdown);

  return sections
    .map((section) => section.markdown)
    .join('\n\n')
    .trim();
}
