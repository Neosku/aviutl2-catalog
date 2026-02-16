import React, { useCallback, useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { useLocation, useParams } from 'react-router-dom';
import ErrorDialog from '../../../components/ErrorDialog.jsx';
import { formatDate, hasInstaller, latestVersionOf } from '../../../utils/index.js';
import { buildLicenseBody } from '../../../utils/licenseTemplates.js';
import { readFromSearch, shouldOpenExternalLink } from '../model/helpers';
import type { CarouselImage, PackageLicense, PackageLicenseEntry } from '../model/types';
import LicenseModal from './components/LicenseModal';
import usePackageAutoInstall from './hooks/usePackageAutoInstall';
import usePackageCatalogContext from './hooks/usePackageCatalogContext';
import usePackageDescription from './hooks/usePackageDescription';
import usePackageInstallActions from './hooks/usePackageInstallActions';
import { PackageContentSection, PackageHeaderSection, PackageSidebarSection } from './sections';

const MARKDOWN_BASE_URL = 'https://raw.githubusercontent.com/Neosku/aviutl2-catalog-data/main/md/';

export default function PackagePage() {
  const { id } = useParams();
  const location = useLocation();
  const { items, loading, dispatch } = usePackageCatalogContext();
  const [openLicense, setOpenLicense] = useState<PackageLicenseEntry | null>(null);

  const fromSearch = readFromSearch(location.state);
  const listLink = useMemo(() => (fromSearch ? { pathname: '/', search: fromSearch } : '/'), [fromSearch]);

  const item = useMemo(() => items.find((entry) => entry.id === id), [id, items]);
  const imageGroups = useMemo(() => (Array.isArray(item?.images) ? item.images : []), [item]);
  const heroImage = useMemo(() => {
    for (const group of imageGroups) {
      if (!Array.isArray(group?.infoImg)) continue;
      const candidate = group.infoImg.find((src) => typeof src === 'string' && src.trim());
      if (candidate) return candidate.trim();
    }
    return '';
  }, [imageGroups]);

  const carouselImages = useMemo<CarouselImage[]>(() => {
    const result: CarouselImage[] = [];
    imageGroups.forEach((group) => {
      if (!Array.isArray(group?.infoImg)) return;
      group.infoImg.forEach((src) => {
        if (typeof src === 'string' && src.trim()) {
          result.push({ src: src.trim(), alt: '' });
        }
      });
    });
    return result;
  }, [imageGroups]);

  const descriptionSource = item?.description || '';
  const description = usePackageDescription({
    descriptionSource,
    baseUrl: MARKDOWN_BASE_URL,
  });

  const actions = usePackageInstallActions({
    item,
    dispatch,
  });

  const canInstall = item ? hasInstaller(item) || !!item.downloadURL : false;

  usePackageAutoInstall({
    item,
    locationSearch: location.search,
    canInstall,
    downloading: actions.downloading,
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
      await open(href);
    } catch {}
  }, []);

  if (!item) {
    if (loading || items.length === 0) {
      return (
        <div className="max-w-3xl mx-auto">
          <div className="p-6 text-slate-500 dark:text-slate-400">読み込み中…</div>
        </div>
      );
    }
    return (
      <div className="max-w-3xl mx-auto">
        <div className="error">パッケージが見つかりませんでした。</div>
      </div>
    );
  }

  const updated = item.updatedAt ? formatDate(item.updatedAt).replace(/-/g, '/') : '?';
  const latest = latestVersionOf(item) || '?';

  return (
    <div className="space-y-6 max-w-6xl mx-auto min-h-[calc(100vh-6rem)] flex flex-col">
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
          downloading={actions.downloading}
          updating={actions.updating}
          removing={actions.removing}
          downloadProgress={actions.downloadProgressView}
          updateProgress={actions.updateProgressView}
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
