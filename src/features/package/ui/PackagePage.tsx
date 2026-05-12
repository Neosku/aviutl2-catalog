import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as tauriShell from '@tauri-apps/plugin-shell';
import { useLocation, useParams } from 'react-router-dom';
import { APP_ROUTE_PATHS } from '@/routePaths';
import ErrorDialog from '@/components/ErrorDialog';
import PackageNoticeModal from '@/components/PackageNoticeModal';
import { useCatalog, useCatalogDispatch } from '@/utils/catalogStore';
import { resolveDisplayAssetUrl } from '@/utils/displayAssetUrl';
import { buildLicenseBody, resolveCatalogLicenseTypeLabel } from '@/utils/licenseTemplates';
import { HOME_LIST_RESTORE_STATE } from '@/layouts/app-shell/types';
import { readPackageDetailSource, readPackageListSearchFromDetail, shouldOpenExternalLink } from '../model/helpers';
import type { PackageLicenseEntry, PackageMarkdownState, PackageRelationSection } from '../model/types';
import LicenseModal from './components/LicenseModal';
import usePackageAutoInstall from './hooks/usePackageAutoInstall';
import usePackageDetailData from './hooks/usePackageDetailData';
import usePackageDescription from './hooks/usePackageDescription';
import usePackageInstallActions from './hooks/usePackageInstallActions';
import usePackageMarkdown from './hooks/usePackageMarkdown';
import { PackageContentSection, PackageHeaderSection, PackageSidebarSection } from './sections';
import { page } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

function resolvePackageListState(search: string) {
  const listSearch = readPackageListSearchFromDetail(search);
  const detailSource = readPackageDetailSource(search);
  const listLink =
    detailSource === 'updates'
      ? APP_ROUTE_PATHS.updates
      : detailSource === 'niconi-commons'
        ? APP_ROUTE_PATHS.niconiCommons
        : listSearch
          ? { pathname: '/', search: listSearch }
          : APP_ROUTE_PATHS.home;

  return { detailSource, listLink };
}

export default function PackagePage() {
  const { t, i18n } = useTranslation(['package', 'common', 'nav']);
  const { id } = useParams();
  const location = useLocation();
  const { items, loading } = useCatalog();
  const dispatch = useCatalogDispatch();
  const [openLicense, setOpenLicense] = useState<PackageLicenseEntry | null>(null);
  const [detailNoticeOpen, setDetailNoticeOpen] = useState(false);
  const packageItems = items;

  const { detailSource, listLink } = useMemo(() => resolvePackageListState(location.search), [location.search]);
  const listLabel =
    detailSource === 'updates'
      ? t('nav:navigation.updates')
      : detailSource === 'niconi-commons'
        ? t('nav:navigation.niconiCommons')
        : t('nav:navigation.home');
  const listLinkState = detailSource === 'home' ? HOME_LIST_RESTORE_STATE : undefined;

  const item = useMemo(() => packageItems.find((entry) => entry.id === id), [id, packageItems]);
  const detailData = usePackageDetailData({
    packageId: item?.id,
    requestedLocale: i18n.resolvedLanguage || i18n.language,
  });
  const detailPackage = detailData.detailPackage;
  const hasNoticeSource = Boolean(detailPackage?.notice?.markdownSource?.trim());
  const detailImageUrls = useMemo(() => {
    if (!detailPackage?.images?.detailImages?.length) {
      return [];
    }
    return detailPackage.images.detailImages.map((src) => resolveDisplayAssetUrl(detailData.detailBaseUrl, src));
  }, [detailData.detailBaseUrl, detailPackage?.images?.detailImages]);
  const heroImage = detailImageUrls[0] || item?.thumbnailUrl || '';
  const carouselImages = useMemo(
    () => detailImageUrls.map((src) => ({ src, alt: item?.name || '' })),
    [detailImageUrls, item?.name],
  );

  const descriptionSource = detailPackage?.description.markdownSource || '';
  const description = usePackageDescription({
    descriptionSource,
    baseUrl: detailData.detailBaseUrl,
  });
  const notice = usePackageMarkdown({
    markdownSource: detailPackage?.notice?.markdownSource,
    baseUrl: detailData.detailBaseUrl,
    loadFailedMessage: t('noticeErrors.loadFailed'),
  });
  const changelog = usePackageMarkdown({
    markdownSource: item?.changelog?.markdownSource,
    baseUrl: '',
    loadFailedMessage: t('changelogErrors.loadFailed'),
  });

  const actions = usePackageInstallActions({
    item,
    dispatch,
  });

  const canInstall = Boolean(item);

  usePackageAutoInstall({
    item,
    locationSearch: location.search,
    canInstall,
    downloading: actions.busyAction === 'download',
    onDownload: actions.onDownload,
  });

  const licenseEntries = useMemo<PackageLicenseEntry[]>(() => {
    if (!detailPackage) return [];
    return detailPackage.licenses.map((license, idx) => {
      const normalizedLicense = {
        type: license.type,
        isCustom: license.type === 'custom',
        copyrights: license.copyrights || [],
        licenseBody: license.licenseBody ?? null,
      };
      const typeLabel = license.name?.trim() || resolveCatalogLicenseTypeLabel(license.type);
      return {
        ...normalizedLicense,
        type: typeLabel,
        key: `${typeLabel || 'license'}-${idx}`,
        body: String(buildLicenseBody(normalizedLicense) || ''),
      };
    });
  }, [detailPackage]);

  const renderableLicenses = useMemo(() => licenseEntries.filter((entry) => entry.body), [licenseEntries]);

  const licenseTypesLabel = useMemo(() => {
    const types =
      detailPackage?.licenses
        .map((license) => license.name?.trim() || resolveCatalogLicenseTypeLabel(license.type))
        .filter(Boolean) ?? [];
    return types.length ? types.join(', ') : '?';
  }, [detailPackage]);
  const relationSections = useMemo<PackageRelationSection[]>(() => {
    if (!detailData.relations) {
      return [];
    }

    const lookup = new Map(packageItems.map((entry) => [entry.id, entry]));
    const sections: Array<{ key: PackageRelationSection['key']; ids: string[] }> = [
      { key: 'requires', ids: detailData.relations.requires || [] },
      { key: 'recommends', ids: detailData.relations.recommends || [] },
      { key: 'conflicts', ids: detailData.relations.conflicts || [] },
      { key: 'similar', ids: detailData.relations.similar || [] },
      { key: 'replaces', ids: detailData.relations.replaces || [] },
      { key: 'forkOf', ids: detailData.relations.forkOf ? [detailData.relations.forkOf] : [] },
    ];

    return sections
      .filter((section) => section.ids.length > 0)
      .map((section) => {
        const relatedItems = section.ids.flatMap((packageId) => {
          const found = lookup.get(packageId);
          return found ? [found] : [];
        });
        const missingIds = section.ids.filter((packageId) => !lookup.has(packageId));
        return {
          key: section.key,
          items: relatedItems,
          missingIds,
        };
      });
  }, [detailData.relations, packageItems]);
  const relationsError = detailData.relationsError;
  const relationsLoading = detailData.loading;
  const contentDescription: PackageMarkdownState = useMemo(
    () => ({
      html: description.descriptionHtml,
      loading: description.descriptionLoading,
      error: description.descriptionError,
    }),
    [description.descriptionError, description.descriptionHtml, description.descriptionLoading],
  );
  const contentNotice: PackageMarkdownState = useMemo(
    () => ({
      html: notice.html,
      loading: notice.loading,
      error: notice.error,
    }),
    [notice.error, notice.html, notice.loading],
  );
  const contentChangelog: PackageMarkdownState = useMemo(
    () => ({
      html: changelog.html,
      loading: changelog.loading,
      error: changelog.error,
    }),
    [changelog.error, changelog.html, changelog.loading],
  );

  const handleOpenDescriptionLink = useCallback(async (href: string) => {
    if (!shouldOpenExternalLink(href)) return;
    try {
      await tauriShell.open(href);
    } catch {}
  }, []);

  if (!item) {
    if (loading || items.length === 0) {
      return (
        <div className={page.container3xl}>
          <div className="p-6 text-slate-500 dark:text-slate-400">{t('common:router.loading')}</div>
        </div>
      );
    }
    return (
      <div className={page.container3xl}>
        <div className="error">{t('page.notFound')}</div>
      </div>
    );
  }

  const updated = item.updatedAt
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(item.updatedAt))
    : '?';
  const latest = item.latestVersion || '?';

  return (
    <div className={cn(page.container6xl, 'space-y-6 min-h-[calc(100vh-6rem)] flex flex-col select-none')}>
      <PackageHeaderSection item={item} listLink={listLink} listLabel={listLabel} heroImage={heroImage} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] flex-1">
        <PackageContentSection
          item={item}
          carouselImages={carouselImages}
          detailError={detailData.error}
          description={contentDescription}
          changelog={contentChangelog}
          relationSections={relationSections}
          relationsLoading={relationsLoading}
          relationsError={relationsError}
          onOpenLink={handleOpenDescriptionLink}
        />
        <PackageSidebarSection
          item={item}
          listLink={listLink}
          listLabel={listLabel}
          listLinkState={listLinkState}
          updated={updated}
          latest={latest}
          originalAuthor={detailPackage?.originalAuthor}
          packagePageUrl={detailPackage?.packagePageUrl}
          canInstall={canInstall}
          busyAction={actions.busyAction}
          isBusy={actions.isBusy}
          progress={actions.progressView}
          hasNotice={hasNoticeSource}
          noticeLoading={hasNoticeSource && (notice.loading || !contentNotice.html)}
          renderableLicenses={renderableLicenses}
          licenseTypesLabel={licenseTypesLabel}
          onOpenNotice={() => setDetailNoticeOpen(true)}
          onOpenLicense={setOpenLicense}
          onDownload={actions.onDownload}
          onUpdate={actions.onUpdate}
          onRemove={actions.onRemove}
        />
      </div>

      {openLicense ? <LicenseModal license={openLicense} onClose={() => setOpenLicense(null)} /> : null}
      <PackageNoticeModal
        open={detailNoticeOpen}
        title={item.name || item.id}
        html={contentNotice.html}
        onClose={() => setDetailNoticeOpen(false)}
        showConfirm={false}
      />
      <PackageNoticeModal
        open={actions.noticeModal.open}
        title={actions.noticeModal.title}
        html={actions.noticeModal.html}
        onConfirm={() => {
          void actions.confirmNoticeModal();
        }}
        onClose={actions.closeNoticeModal}
      />
      <ErrorDialog open={Boolean(actions.error)} message={actions.error} onClose={() => actions.setError('')} />
    </div>
  );
}
