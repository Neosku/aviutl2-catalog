import { catalogEntrySchema, type CatalogEntry } from '../../../utils/catalogSchema';
import { getErrorMessage } from './helpers';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U> ? Array<DeepPartial<U>> : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

type CatalogPatch = DeepPartial<CatalogEntry> & { id: string };

function extractCatalogArray(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (!isPlainObject(json)) return null;
  return Array.isArray(json.packages) ? json.packages : null;
}

function mergeDefinedFields<T>(base: T, patch: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T;
  const next: Record<string, unknown> = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    if (typeof value === 'undefined') return;
    const baseValue = next[key];
    if (isPlainObject(baseValue) && isPlainObject(value)) {
      next[key] = mergeDefinedFields(baseValue, value);
      return;
    }
    next[key] = value;
  });
  return next as T;
}

function extractVersionKey(value: unknown): string {
  if (!isPlainObject(value)) return '';
  return typeof value.version === 'string' ? value.version.trim() : '';
}

function mergeVersionListByVersionKey(
  baseList: CatalogEntry['version'],
  patchList: unknown[],
): CatalogEntry['version'] {
  const next: unknown[] = [...baseList];
  const indexByVersion = new Map<string, number>();

  for (let i = 0; i < next.length; i += 1) {
    const key = extractVersionKey(next[i]);
    if (!key || indexByVersion.has(key)) continue;
    indexByVersion.set(key, i);
  }

  for (let i = 0; i < patchList.length; i += 1) {
    const patchVersion = patchList[i];
    const key = extractVersionKey(patchVersion);
    const existingIndex = key ? indexByVersion.get(key) : undefined;
    if (typeof existingIndex === 'number') {
      const currentVersion = next[existingIndex];
      next[existingIndex] =
        isPlainObject(currentVersion) && isPlainObject(patchVersion)
          ? mergeDefinedFields(currentVersion, patchVersion)
          : patchVersion;
      continue;
    }
    next.push(patchVersion);
    if (key) {
      indexByVersion.set(key, next.length - 1);
    }
  }

  return next as CatalogEntry['version'];
}

function mergeCatalogEntryWithPatch(base: CatalogEntry, patch: CatalogPatch): CatalogEntry {
  const merged = mergeDefinedFields(base, patch);
  if (!Object.prototype.hasOwnProperty.call(patch, 'version')) {
    return { ...merged, id: base.id };
  }
  if (!Array.isArray(base.version) || !Array.isArray(patch.version)) {
    return { ...merged, id: base.id };
  }
  const nextVersion = mergeVersionListByVersionKey(base.version, patch.version);
  return { ...merged, id: base.id, version: nextVersion };
}

function isDeepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!isDeepEqual(left[i], right[i])) return false;
    }
    return true;
  }
  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      if (!isDeepEqual(left[key], right[key])) return false;
    }
    return true;
  }
  return false;
}

function extractCatalogPatchList(json: unknown): CatalogPatch[] {
  const rawList = extractCatalogArray(json);
  if (!Array.isArray(rawList)) {
    throw new Error('入力形式が不正です。');
  }
  const list = rawList
    .filter((item): item is Record<string, unknown> => isPlainObject(item))
    .map((item) => {
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      if (!id) return null;
      return { ...(item as DeepPartial<CatalogEntry>), id } as CatalogPatch;
    })
    .filter((item): item is CatalogPatch => item !== null);
  if (list.length === 0) {
    throw new Error('上書き対象の要素がありません。');
  }
  return list;
}

function createCatalogEntryFromPatch(patch: CatalogPatch): CatalogEntry {
  const base: CatalogEntry = {
    id: patch.id,
    name: '',
    type: '',
    summary: '',
    description: '',
    author: '',
    repoURL: '',
    'latest-version': '',
    popularity: 0,
    trend: 0,
    licenses: [],
    tags: [],
    dependencies: [],
    images: [],
    installer: {
      source: { direct: '' },
      install: [],
      uninstall: [],
    },
    version: [],
  };
  const merged = mergeDefinedFields(base, patch);
  return catalogEntrySchema.parse({ ...merged, id: patch.id });
}

export function applyCatalogJsonPatch(args: { catalogItems: CatalogEntry[]; jsonText: string }): {
  changedItems: CatalogEntry[];
  nextCatalogItems: CatalogEntry[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(args.jsonText);
  } catch (error: unknown) {
    throw new Error(`JSON の解析に失敗しました: ${getErrorMessage(error)}`, { cause: error });
  }

  const patchList = extractCatalogPatchList(parsed);
  const patchMap = new Map<string, CatalogPatch>();
  patchList.forEach((patch) => {
    patchMap.set(patch.id, patch);
  });

  const existingIds = new Set(args.catalogItems.map((item) => item.id));
  const nextCatalogItems: CatalogEntry[] = [];
  const changedItems: CatalogEntry[] = [];

  for (const item of args.catalogItems) {
    const patch = patchMap.get(item.id);
    if (!patch) {
      nextCatalogItems.push(item);
      continue;
    }
    const nextItem = catalogEntrySchema.parse(mergeCatalogEntryWithPatch(item, patch));
    nextCatalogItems.push(nextItem);
    if (isDeepEqual(item, nextItem)) continue;
    changedItems.push(nextItem);
  }

  for (const patch of patchMap.values()) {
    if (existingIds.has(patch.id)) continue;
    const nextItem = createCatalogEntryFromPatch(patch);
    nextCatalogItems.push(nextItem);
    changedItems.push(nextItem);
    existingIds.add(patch.id);
  }

  return { changedItems, nextCatalogItems };
}
