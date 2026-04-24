import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as tauriShell from '@tauri-apps/plugin-shell';
import { useLocation, useParams } from 'react-router-dom';
import { APP_ROUTE_PATHS } from '@/routePaths';
import ErrorDialog from '@/components/ErrorDialog';
import { useCatalog, useCatalogDispatch } from '@/utils/catalogStore';
import { buildLicenseBody, resolveCatalogLicenseTypeLabel } from '@/utils/licenseTemplates';
import { HOME_LIST_RESTORE_STATE } from '@/layouts/app-shell/types';
import {
  collectPackageImages,
  readPackageDetailSource,
  readPackageListSearchFromDetail,
  shouldOpenExternalLink,
} from '../model/helpers';
import type { PackageLicenseEntry } from '../model/types';
import LicenseModal from './components/LicenseModal';
import usePackageAutoInstall from './hooks/usePackageAutoInstall';
import usePackageDescription from './hooks/usePackageDescription';
import usePackageInstallActions from './hooks/usePackageInstallActions';
import { PackageContentSection, PackageHeaderSection, PackageSidebarSection } from './sections';
import { page } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const MARKDOWN_BASE_URL = 'https://raw.githubusercontent.com/Neosku/aviutl2-catalog-data/main/md/';

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
  const { heroImage, carouselImages } = useMemo(() => collectPackageImages(item?.images), [item?.images]);

  const descriptionSource = item?.description || '';
  const description = usePackageDescription({
    descriptionSource,
    baseUrl: MARKDOWN_BASE_URL,
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
    if (!item) return [];
    const rawLicenses = Array.isArray(item.licenses) ? item.licenses : [];
    const entries = rawLicenses.map((license, idx) => {
      const typeLabel = resolveCatalogLicenseTypeLabel(license.type);
      return {
        ...license,
        type: typeLabel,
        key: `${typeLabel || 'license'}-${idx}`,
        body: String(buildLicenseBody(license) || ''),
      };
    });
    return entries;
  }, [item]);

  const renderableLicenses = useMemo(() => licenseEntries.filter((entry) => entry.body), [licenseEntries]);

  const licenseTypesLabel = useMemo(() => {
    const types = Array.isArray(item?.licenses)
      ? item.licenses.map((license) => resolveCatalogLicenseTypeLabel(license?.type)).filter(Boolean)
      : [];
    return types.length ? types.join(', ') : '?';
  }, [item]);

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
          descriptionHtml={description.descriptionHtml}
          descriptionLoading={description.descriptionLoading}
          descriptionError={description.descriptionError}
          onOpenLink={handleOpenDescriptionLink}
        />
        <PackageSidebarSection
          item={item}
          listLink={listLink}
          listLabel={listLabel}
          listLinkState={listLinkState}
          updated={updated}
          latest={latest}
          canInstall={canInstall}
          busyAction={actions.busyAction}
          isBusy={actions.isBusy}
          progress={actions.progressView}
          renderableLicenses={renderableLicenses}
          licenseTypesLabel={licenseTypesLabel}
          onOpenLicense={setOpenLicense}
          onDownload={actions.onDownload}
          onUpdate={actions.onUpdate}
          onRemove={actions.onRemove}
        />
      </div>

      {openLicense ? <LicenseModal license={openLicense} onClose={() => setOpenLicense(null)} /> : null}
      <ErrorDialog open={Boolean(actions.error)} message={actions.error} onClose={() => actions.setError('')} />
    </div>
  );
}
