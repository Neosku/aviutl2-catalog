import * as z from 'zod';
import type { CatalogBootstrapPackage } from '@/utils/catalogBootstrapModel';
import type { CatalogStorePackage } from '@/utils/catalogStore';
import { isInstalledDetectResult, type DetectResultMap } from '@/utils/detectResult';
import type { EligibleItem, NiconiCommonsExportPackage, SelectedMap } from './types';

export const DESELECTED_IDS_STORAGE_KEY = 'niconiCommonsDeselectedIds';

const deselectedIdsSchema = z.array(z.string());

export function loadDeselectedNiconiCommonsIds(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(DESELECTED_IDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = deselectedIdsSchema.safeParse(parsed);
    if (!result.success) return [];
    return result.data.map((id) => id.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveDeselectedNiconiCommonsIds(ids: string[]): void {
  if (typeof window === 'undefined') return;

  const normalized = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).toSorted();
  try {
    window.localStorage.setItem(DESELECTED_IDS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {}
}

export function buildInitialSelectedMap(items: EligibleItem[], deselectedIds: string[]): SelectedMap {
  const deselectedSet = new Set(deselectedIds);
  const next: SelectedMap = {};
  items.forEach((item) => {
    next[item.id] = !deselectedSet.has(item.id);
  });
  return next;
}

export function buildDeselectedIds(items: EligibleItem[], selectedMap: SelectedMap): string[] {
  return items.filter((item) => !selectedMap[item.id]).map((item) => item.id);
}

export function buildSelectedNiconiCommonsIds(items: EligibleItem[], selectedMap: SelectedMap): string[] {
  const ids = items.filter((item) => selectedMap[item.id]).map((item) => item.niconiCommonsId);
  return Array.from(new Set(ids));
}

export function buildNiconiCommonsExportPackagesFromSelectedItems(
  items: EligibleItem[],
  selectedMap: SelectedMap,
): NiconiCommonsExportPackage[] {
  return items
    .filter((item) => selectedMap[item.id])
    .map((item) => ({
      packageId: item.id,
      name: item.name || item.id,
      niconiCommonsId: item.niconiCommonsId,
    }));
}

export function buildNiconiCommonsExportPackagesFromDetectedMap(
  items: CatalogBootstrapPackage[],
  detectedMap: DetectResultMap,
  deselectedIds: string[],
): NiconiCommonsExportPackage[] {
  const deselectedSet = new Set(deselectedIds);
  return items
    .filter((item): item is CatalogBootstrapPackage & { niconiCommonsId: string } => Boolean(item.niconiCommonsId))
    .filter((item) => !deselectedSet.has(item.id))
    .filter((item) => isInstalledDetectResult(detectedMap[item.id]))
    .map((item) => ({
      packageId: item.id,
      name: item.name || item.id,
      niconiCommonsId: item.niconiCommonsId,
    }));
}

export function isInstalledNiconiCommonsItem(item: CatalogStorePackage): item is EligibleItem {
  return Boolean(item.installed && item.niconiCommonsId);
}
