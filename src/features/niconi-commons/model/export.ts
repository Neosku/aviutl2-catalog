import { ipc } from '@/utils/invokeIpc';
import {
  buildNiconiCommonsExportPackagesFromDetectedMap,
  buildNiconiCommonsExportPackagesFromSelectedItems,
  loadDeselectedNiconiCommonsIds,
} from './selection';
import type { NiconiCommonsExportPayload, NiconiCommonsExportPackage, SelectedMap } from './types';
import type { CatalogBootstrapPackage } from '@/utils/catalogBootstrapModel';
import type { DetectResultMap } from '@/utils/detectResult';
import type { EligibleItem } from './types';

const EXPORT_SCHEMA_VERSION = 1;

function uniquePackages(packages: NiconiCommonsExportPackage[]): NiconiCommonsExportPackage[] {
  const seen = new Set<string>();
  const unique: NiconiCommonsExportPackage[] = [];
  packages.forEach((entry) => {
    const key = entry.niconiCommonsId.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    unique.push(entry);
  });
  return unique;
}

function buildPayload(packages: NiconiCommonsExportPackage[]): NiconiCommonsExportPayload {
  const unique = uniquePackages(packages).toSorted((a, b) => a.name.localeCompare(b.name, 'ja'));
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ids: unique.map((entry) => entry.niconiCommonsId),
    packages: unique,
  };
}

export async function writeNiconiCommonsExportFile(packages: NiconiCommonsExportPackage[]): Promise<void> {
  await ipc.writeNiconiCommonsIds({ payload: buildPayload(packages) });
}

export async function exportNiconiCommonsIdsFromDetectedMap(
  items: CatalogBootstrapPackage[],
  detectedMap: DetectResultMap,
): Promise<void> {
  const packages = buildNiconiCommonsExportPackagesFromDetectedMap(
    items,
    detectedMap,
    loadDeselectedNiconiCommonsIds(),
  );
  await writeNiconiCommonsExportFile(packages);
}

export async function exportNiconiCommonsIdsFromSelectedItems(
  items: EligibleItem[],
  selectedMap: SelectedMap,
): Promise<void> {
  await writeNiconiCommonsExportFile(buildNiconiCommonsExportPackagesFromSelectedItems(items, selectedMap));
}
