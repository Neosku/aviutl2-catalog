import { i18n } from '@/i18n';
import { loadDetailCatalog, loadMarkdown } from './catalogClient';
import { resolveUrl } from './catalog-schema/utils/pathUtils';

export interface PackageNoticeContent {
  title: string;
  html: string;
}

export async function loadPackageNoticeContent(packageId: string): Promise<PackageNoticeContent | null> {
  const normalizedId = typeof packageId === 'string' ? packageId.trim() : '';
  if (!normalizedId) {
    return null;
  }

  const detailResult = await loadDetailCatalog({
    requestedLocale: i18n.resolvedLanguage || i18n.language,
  });
  const detailPackage = detailResult.detail.packages[normalizedId];
  const noticeSource = detailPackage?.notice?.markdownSource?.trim();
  if (!noticeSource) {
    return null;
  }

  const markdownText = await loadMarkdown(noticeSource, detailResult.baseUrls.detail);
  const { renderMarkdown } = await import('./markdown');
  return {
    title: detailPackage?.packagePageUrl || normalizedId,
    html: renderMarkdown(markdownText, {
      baseUrl: resolveUrl(detailResult.baseUrls.detail, noticeSource),
    }),
  };
}
