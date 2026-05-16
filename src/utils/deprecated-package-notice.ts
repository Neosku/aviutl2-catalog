import { ipc } from './invokeIpc';
import { getSettings } from './settings';
import { normalizeStringIdList } from './normalizeStringIdList';

let cachedDismissedDeprecatedPackageIds: string[] | null = null;

export async function loadDismissedDeprecatedPackageIds(): Promise<string[]> {
  if (cachedDismissedDeprecatedPackageIds) {
    return cachedDismissedDeprecatedPackageIds;
  }
  const settings = await getSettings();
  const ids = normalizeStringIdList(settings.deprecated_notice_dismissed_ids);
  cachedDismissedDeprecatedPackageIds = ids;
  return ids;
}

export async function persistDismissedDeprecatedPackages(packageIds: string[]): Promise<string[]> {
  const ids = normalizeStringIdList(await ipc.dismissDeprecatedPackageNotice({ packageIds }));
  cachedDismissedDeprecatedPackageIds = ids;
  return ids;
}
