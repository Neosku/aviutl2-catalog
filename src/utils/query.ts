import { normalize } from './text';

type NameSortable = {
  nameKey?: string | null;
};

type FilterableItem = {
  tags?: unknown;
  type?: unknown;
};

type SortableItem = NameSortable & {
  updatedAt?: number | null;
  popularityScore?: unknown;
  popularity?: unknown;
  trend?: unknown;
  catalogIndex?: unknown;
};

type SearchableItem = {
  nameKey?: string | null;
  authorKey?: string | null;
  summaryKey?: string | null;
};

export const PRIMARY_PACKAGE_TYPES = [
  { label: '本体', icon: 'app-window' },
  { label: 'MOD', icon: 'app-window' },
  { label: '入力プラグイン', icon: 'file-input' },
  { label: '出力プラグイン', icon: 'file-output' },
  { label: '汎用プラグイン', icon: 'puzzle' },
  { label: 'フィルタプラグイン', icon: 'sliders-horizontal' },
  { label: 'スクリプト', icon: 'file-code-2' },
] as const;

export type PrimaryPackageType = (typeof PRIMARY_PACKAGE_TYPES)[number];
export type PrimaryPackageTypeLabel = PrimaryPackageType['label'];
export type PrimaryPackageTypeIcon = PrimaryPackageType['icon'];

const PRIMARY_PACKAGE_TYPE_LABELS: string[] = PRIMARY_PACKAGE_TYPES.map((type) => type.label);

export const ORDERED_PACKAGE_TYPES = [...PRIMARY_PACKAGE_TYPE_LABELS, 'その他'] as const;

function cmpNameAsc(a: NameSortable, b: NameSortable): number {
  const x = a.nameKey || '';
  const y = b.nameKey || '';
  return x < y ? -1 : x > y ? 1 : 0;
}

function normalizePackageType(type: unknown): string {
  return typeof type === 'string' ? type.trim() : '';
}

export function getPrimaryPackageTypeMeta(type: unknown): PrimaryPackageType | null {
  const normalized = normalizePackageType(type);
  return PRIMARY_PACKAGE_TYPES.find((packageType) => packageType.label === normalized) ?? null;
}

function isOtherPackageType(type: unknown): boolean {
  const normalized = normalizePackageType(type);
  return !normalized || !PRIMARY_PACKAGE_TYPE_LABELS.includes(normalized);
}

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function matchQuery(item: SearchableItem, q: unknown): boolean {
  if (!q) return true;
  const keys = [item.nameKey || '', item.authorKey || '', item.summaryKey || ''];
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  return terms.every((t) => keys.some((k) => k.includes(t)));
}

export function filterByTagsAndType<T extends FilterableItem>(
  items: T[],
  tags: string[] = [],
  types: string[] = [],
): T[] {
  return items.filter((it) => {
    const itemTags = Array.isArray(it.tags) ? it.tags.filter((tag): tag is string => typeof tag === 'string') : [];
    const tagOk = !tags.length || itemTags.some((tag) => tags.includes(tag));
    const itemType = normalizePackageType(it.type);
    const typeOk =
      !types.length ||
      types.some((selectedType) => {
        const normalizedSelectedType = normalizePackageType(selectedType);
        if (normalizedSelectedType === 'その他') return isOtherPackageType(itemType);
        return itemType === normalizedSelectedType;
      });
    return tagOk && typeOk;
  });
}

export function getSorter(
  key: string = 'newest',
  dir: 'asc' | 'desc' = 'desc',
): (a: SortableItem, b: SortableItem) => number {
  if (key === 'name') {
    if (dir === 'desc') return (a: SortableItem, b: SortableItem): number => -cmpNameAsc(a, b);
    return cmpNameAsc;
  }
  if (key === 'popularity') {
    const compareByUpdatedAt = (a: SortableItem, b: SortableItem): number => {
      const d =
        (b.updatedAt == null ? Number.NEGATIVE_INFINITY : b.updatedAt) -
        (a.updatedAt == null ? Number.NEGATIVE_INFINITY : a.updatedAt);
      return d || cmpNameAsc(a, b);
    };
    if (dir === 'asc') {
      return (a: SortableItem, b: SortableItem): number => {
        const ap = toFiniteNumber(a.popularityScore ?? a.popularity);
        const bp = toFiniteNumber(b.popularityScore ?? b.popularity);
        const d = (ap == null ? Number.POSITIVE_INFINITY : ap) - (bp == null ? Number.POSITIVE_INFINITY : bp);
        return d || compareByUpdatedAt(a, b);
      };
    }
    return (a: SortableItem, b: SortableItem): number => {
      const ap = toFiniteNumber(a.popularityScore ?? a.popularity);
      const bp = toFiniteNumber(b.popularityScore ?? b.popularity);
      const d = (bp == null ? Number.NEGATIVE_INFINITY : bp) - (ap == null ? Number.NEGATIVE_INFINITY : ap);
      return d || compareByUpdatedAt(a, b);
    };
  }
  if (key === 'trend') {
    const compareByUpdatedAt = (a: SortableItem, b: SortableItem): number => {
      const d =
        (b.updatedAt == null ? Number.NEGATIVE_INFINITY : b.updatedAt) -
        (a.updatedAt == null ? Number.NEGATIVE_INFINITY : a.updatedAt);
      return d || cmpNameAsc(a, b);
    };
    if (dir === 'asc') {
      return (a: SortableItem, b: SortableItem): number => {
        const ap = toFiniteNumber(a.trend);
        const bp = toFiniteNumber(b.trend);
        const d = (ap == null ? Number.POSITIVE_INFINITY : ap) - (bp == null ? Number.POSITIVE_INFINITY : bp);
        return d || compareByUpdatedAt(a, b);
      };
    }
    return (a: SortableItem, b: SortableItem): number => {
      const ap = toFiniteNumber(a.trend);
      const bp = toFiniteNumber(b.trend);
      const d = (bp == null ? Number.NEGATIVE_INFINITY : bp) - (ap == null ? Number.NEGATIVE_INFINITY : ap);
      return d || compareByUpdatedAt(a, b);
    };
  }
  if (key === 'added') {
    if (dir === 'asc') {
      return (a: SortableItem, b: SortableItem): number => {
        const ap = toFiniteNumber(a.catalogIndex);
        const bp = toFiniteNumber(b.catalogIndex);
        const d = (ap == null ? Number.POSITIVE_INFINITY : ap) - (bp == null ? Number.POSITIVE_INFINITY : bp);
        return d || cmpNameAsc(a, b);
      };
    }
    return (a: SortableItem, b: SortableItem): number => {
      const ap = toFiniteNumber(a.catalogIndex);
      const bp = toFiniteNumber(b.catalogIndex);
      const d = (bp == null ? Number.NEGATIVE_INFINITY : bp) - (ap == null ? Number.NEGATIVE_INFINITY : ap);
      return d || cmpNameAsc(a, b);
    };
  }
  if (dir === 'asc') {
    return (a: SortableItem, b: SortableItem): number => {
      const d =
        (a.updatedAt == null ? Number.POSITIVE_INFINITY : a.updatedAt) -
        (b.updatedAt == null ? Number.POSITIVE_INFINITY : b.updatedAt);
      return d || cmpNameAsc(a, b);
    };
  }
  return (a: SortableItem, b: SortableItem): number => {
    const d =
      (b.updatedAt == null ? Number.NEGATIVE_INFINITY : b.updatedAt) -
      (a.updatedAt == null ? Number.NEGATIVE_INFINITY : a.updatedAt);
    return d || cmpNameAsc(a, b);
  };
}
