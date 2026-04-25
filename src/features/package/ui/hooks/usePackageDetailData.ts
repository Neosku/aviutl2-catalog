import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadDetailCatalog, loadInstallCatalog } from '@/utils/catalogClient';
import type { CatalogDetailPackage } from '@/utils/catalog-schema/distribution/detailSchema';
import type { CatalogInstallPackage } from '@/utils/catalog-schema/distribution/installSchema';

interface UsePackageDetailDataParams {
  packageId?: string;
  requestedLocale?: string | null;
}

interface PackageDetailDataState {
  detailPackage: CatalogDetailPackage | null;
  relations: CatalogInstallPackage['relations'] | null;
  detailBaseUrl: string;
  loading: boolean;
  error: string;
  relationsError: string;
}

const INITIAL_STATE: PackageDetailDataState = {
  detailPackage: null,
  relations: null,
  detailBaseUrl: '',
  loading: false,
  error: '',
  relationsError: '',
};

export default function usePackageDetailData({ packageId, requestedLocale }: UsePackageDetailDataParams) {
  const { t } = useTranslation('package');
  const [state, setState] = useState<PackageDetailDataState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    const id = typeof packageId === 'string' ? packageId.trim() : '';

    if (!id) {
      setState(INITIAL_STATE);
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: '',
      relationsError: '',
    }));

    void (async () => {
      try {
        const detailResult = await loadDetailCatalog({ requestedLocale });
        const detailPackage = detailResult.detail.packages[id] || null;
        let installPackage: CatalogInstallPackage | null = null;
        let relationsError = '';

        try {
          const installResult = await loadInstallCatalog();
          installPackage = installResult.install.packages[id] || null;
        } catch {
          relationsError = t('errors.relationsLoadFailed');
        }

        if (!detailPackage) {
          throw new Error('package detail is unavailable');
        }

        if (!cancelled) {
          setState({
            detailPackage,
            relations: installPackage?.relations || null,
            detailBaseUrl: detailResult.baseUrls.detail,
            loading: false,
            error: '',
            relationsError,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            detailPackage: null,
            relations: null,
            detailBaseUrl: '',
            loading: false,
            error: t('errors.detailLoadFailed'),
            relationsError: '',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [packageId, requestedLocale, t]);

  return state;
}
