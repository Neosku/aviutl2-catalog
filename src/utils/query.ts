import { normalize } from './text';

type NameSortable = {
  nameKey?: string | null;
};

type FilterableItem = {
  tags?: string[];
  packageType?: string;
};

type SortableItem = NameSortable & {
  updatedAt?: number | null;
  popularityScore?: number;
  popularity?: number;
  trend?: number;
  catalogIndex?: number;
};

type SearchableItem = {
  nameKey?: string | null;
  authorKey?: string | null;
  summaryKey?: string | null;
};

export const PRIMARY_PACKAGE_TYPES = [
  { key: 'core', label: '本体', icon: 'app-window' },
  { key: 'mod', label: 'MOD', icon: 'app-window' },
  { key: 'input-plugin', label: '入力プラグイン', icon: 'file-input' },
  { key: 'output-plugin', label: '出力プラグイン', icon: 'file-output' },
  { key: 'general-plugin', label: '汎用プラグイン', icon: 'puzzle' },
  { key: 'filter-plugin', label: 'フィルタプラグイン', icon: 'sliders-horizontal' },
  { key: 'script', label: 'スクリプト', icon: 'file-code-2' },
] as const;

export type PrimaryPackageType = (typeof PRIMARY_PACKAGE_TYPES)[number];
export type PackageTypeFilterKey = PrimaryPackageType['key'] | 'other' | 'all';
export type PrimaryPackageTypeLabel = PrimaryPackageType['label'];
export type PrimaryPackageTypeIcon = PrimaryPackageType['icon'];
export type PackageTypeTranslationKey =
  | 'core'
  | 'mod'
  | 'inputPlugin'
  | 'outputPlugin'
  | 'generalPlugin'
  | 'filterPlugin'
  | 'script'
  | 'other';

const PRIMARY_PACKAGE_TYPE_KEYS: readonly Exclude<PackageTypeFilterKey, 'all' | 'other'>[] = PRIMARY_PACKAGE_TYPES.map(
  (type) => type.key,
);
const PRIMARY_PACKAGE_TYPES_BY_LABEL = Object.fromEntries(
  PRIMARY_PACKAGE_TYPES.map((type) => [type.label, type]),
) as Record<string, PrimaryPackageType>;
const PACKAGE_TYPE_KEYS = new Set<PackageTypeFilterKey>(['all', ...PRIMARY_PACKAGE_TYPE_KEYS, 'other']);
const PACKAGE_TYPE_TRANSLATION_KEYS = {
  core: 'core',
  mod: 'mod',
  'input-plugin': 'inputPlugin',
  'output-plugin': 'outputPlugin',
  'general-plugin': 'generalPlugin',
  'filter-plugin': 'filterPlugin',
  script: 'script',
  other: 'other',
} as const satisfies Record<Exclude<PackageTypeFilterKey, 'all'>, PackageTypeTranslationKey>;

export const ORDERED_PACKAGE_TYPE_KEYS: readonly PackageTypeFilterKey[] = [
  'all',
  ...PRIMARY_PACKAGE_TYPE_KEYS,
  'other',
];

function cmpNameAsc(a: NameSortable, b: NameSortable): number {
  const x = a.nameKey || '';
  const y = b.nameKey || '';
  return x < y ? -1 : x > y ? 1 : 0;
}

function normalizePackageType(type: unknown): string {
  return typeof type === 'string' ? type.trim() : '';
}

function normalizePackageTypeKey(value: unknown): PackageTypeFilterKey | null {
  const normalized = normalizePackageType(value);
  return PACKAGE_TYPE_KEYS.has(normalized as PackageTypeFilterKey) ? (normalized as PackageTypeFilterKey) : null;
}

export function getPrimaryPackageTypeMeta(type: unknown): PrimaryPackageType | null {
  const normalized = normalizePackageType(type);
  if (!normalized) return null;
  if (normalized === 'core') return PRIMARY_PACKAGE_TYPES[0];
  if (normalized === 'mod') return PRIMARY_PACKAGE_TYPES[1];
  if (normalized === 'inputPlugin' || normalized === 'input-plugin') return PRIMARY_PACKAGE_TYPES[2];
  if (normalized === 'outputPlugin' || normalized === 'output-plugin') return PRIMARY_PACKAGE_TYPES[3];
  if (normalized === 'generalPlugin' || normalized === 'general-plugin') return PRIMARY_PACKAGE_TYPES[4];
  if (normalized === 'filterPlugin' || normalized === 'filter-plugin') return PRIMARY_PACKAGE_TYPES[5];
  if (normalized === 'script') return PRIMARY_PACKAGE_TYPES[6];
  return PRIMARY_PACKAGE_TYPES_BY_LABEL[normalized] ?? null;
}

function isOtherPackageType(type: unknown): boolean {
  return getPrimaryPackageTypeMeta(type) == null;
}

export function packageTypeKeyFromRaw(type: unknown): Exclude<PackageTypeFilterKey, 'all'> {
  return getPrimaryPackageTypeMeta(type)?.key ?? 'other';
}

export function packageTypeKeyToTranslationKey(type: Exclude<PackageTypeFilterKey, 'all'>): PackageTypeTranslationKey {
  return PACKAGE_TYPE_TRANSLATION_KEYS[type];
}

export function packageTypeKeyFromQueryValue(value: string | null): PackageTypeFilterKey {
  return normalizePackageTypeKey(value) ?? 'all';
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
  types: PackageTypeFilterKey[] = [],
): T[] {
  return items.filter((it) => {
    const itemTags = Array.isArray(it.tags) ? it.tags.filter((tag): tag is string => typeof tag === 'string') : [];
    const tagOk = !tags.length || itemTags.some((tag) => tags.includes(tag));
    const rawType = normalizePackageType(it.packageType);
    const itemTypeKey = packageTypeKeyFromRaw(rawType);
    const typeOk =
      !types.length ||
      types.some((selectedType) => {
        if (selectedType === 'all') return true;
        if (selectedType === 'other') return isOtherPackageType(rawType);
        return itemTypeKey === selectedType;
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
