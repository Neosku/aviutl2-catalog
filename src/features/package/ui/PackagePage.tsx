import { useCallback, useMemo, useState } from 'react';
import * as tauriShell from '@tauri-apps/plugin-shell';
import { useLocation, useParams } from 'react-router-dom';
import ErrorDialog from '../../../components/ErrorDialog';
import { latestVersionOf } from '../../../utils/catalog';
import { useCatalog, useCatalogDispatch } from '../../../utils/catalogStore';
import { hasInstaller } from '../../../utils/installer';
import { buildLicenseBody } from '../../../utils/licenseTemplates';
import { formatDate } from '../../../utils/text';
import { collectPackageImages, readPackageListSearchFromDetail, shouldOpenExternalLink } from '../model/helpers';
import type { PackageItem, PackageLicense, PackageLicenseEntry } from '../model/types';
import LicenseModal from './components/LicenseModal';
import usePackageAutoInstall from './hooks/usePackageAutoInstall';
import usePackageDescription from './hooks/usePackageDescription';
import usePackageInstallActions from './hooks/usePackageInstallActions';
import { PackageContentSection, PackageHeaderSection, PackageSidebarSection } from './sections';
import { page } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const MARKDOWN_BASE_URL = 'https://raw.githubusercontent.com/Neosku/aviutl2-catalog-data/main/md/';

export default function PackagePage() {
  const { id } = useParams();
  const location = useLocation();
  const { items, loading } = useCatalog();
  const dispatch = useCatalogDispatch();
  const [openLicense, setOpenLicense] = useState<PackageLicenseEntry | null>(null);
  const packageItems = items as PackageItem[];

  const listSearch = useMemo(() => readPackageListSearchFromDetail(location.search), [location.search]);
  const listLink = useMemo(() => (listSearch ? { pathname: '/', search: listSearch } : '/'), [listSearch]);

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

  const canInstall = item ? hasInstaller(item) : false;

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
    const entries = rawLicenses.map((license, idx) => ({
      ...license,
      key: `${license.type || 'license'}-${idx}`,
      body: String(buildLicenseBody(license) || ''),
    }));
    if (!entries.length && item.license) {
      const fallback: PackageLicense = { type: item.license, isCustom: false, licenseBody: '', copyrights: [] };
      entries.push({
        ...fallback,
        key: 'legacy-license',
        body: String(buildLicenseBody(fallback) || ''),
      });
    }
    return entries;
  }, [item]);

  const renderableLicenses = useMemo(() => licenseEntries.filter((entry) => entry.body), [licenseEntries]);

  const licenseTypesLabel = useMemo(() => {
    const types = Array.isArray(item?.licenses) ? item.licenses.map((license) => license?.type).filter(Boolean) : [];
    if (!types.length && item?.license) types.push(item.license);
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
          <div className="p-6 text-slate-500 dark:text-slate-400">読み込み中…</div>
        </div>
      );
    }
    return (
      <div className={page.container3xl}>
        <div className="error">パッケージが見つかりませんでした。</div>
      </div>
    );
  }

  const updated = item.updatedAt ? formatDate(item.updatedAt).replace(/-/g, '/') : '?';
  const latest = latestVersionOf(item) || '?';

  return (
    <div className={cn(page.container6xl, 'space-y-6 min-h-[calc(100vh-6rem)] flex flex-col select-none')}>
      <PackageHeaderSection item={item} listLink={listLink} heroImage={heroImage} />

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
