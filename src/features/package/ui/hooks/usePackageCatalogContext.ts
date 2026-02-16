import { useCatalog, useCatalogDispatch } from '../../../../utils/catalogStore.jsx';
import type { CatalogDispatch, PackageItem } from '../../model/types';

interface PackageCatalogSnapshot {
  items: PackageItem[];
  loading: boolean;
}

function isPackageItem(value: unknown): value is PackageItem {
  return Boolean(value) && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string';
}

function toSnapshot(value: unknown): PackageCatalogSnapshot {
  const raw = value as { items?: unknown; loading?: unknown } | null;
  const items = Array.isArray(raw?.items) ? raw.items.filter(isPackageItem) : [];
  const loading = typeof raw?.loading === 'boolean' ? raw.loading : false;
  return { items, loading };
}

export default function usePackageCatalogContext() {
  const snapshot = toSnapshot(useCatalog());
  const dispatch = useCatalogDispatch() as CatalogDispatch;
  return { ...snapshot, dispatch };
}
