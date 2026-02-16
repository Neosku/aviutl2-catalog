import type { PackageState } from '../../model/types';

export function createDefaultPackageState(): PackageState {
  return {
    downloading: false,
    installed: false,
    error: '',
    progress: null,
  };
}
