import { catalogPackageIdPattern } from '../shared';

export interface PackageIdParts {
  namespace: string;
  packageSlug: string;
}

export function splitPackageId(packageId: string): PackageIdParts | null {
  const normalized = packageId.trim();
  if (!catalogPackageIdPattern.test(normalized)) {
    return null;
  }
  const [namespace, packageSlug] = normalized.split('.');
  if (!namespace || !packageSlug) {
    return null;
  }
  return { namespace, packageSlug };
}
