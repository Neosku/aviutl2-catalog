/**
 * ライセンスとインストーラー編集の更新ハンドラ群を提供する hook
 */
import { useCallback } from 'react';
import { createEmptyCopyright, createEmptyLicense, createEmptyVersionFile, createEmptyVersion } from '../../model/form';
import { generateKey } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import type { RegisterStepType } from '../types';

interface UseRegisterInstallerLicenseHandlersArgs {
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export default function useRegisterInstallerLicenseHandlers({
  setPackageForm,
  setExpandedVersionKeys,
}: UseRegisterInstallerLicenseHandlersArgs) {
  const updatePackageField = useCallback(
    (field: keyof RegisterPackageForm, value: any) => {
      setPackageForm((prev) => ({ ...prev, [field]: value }));
    },
    [setPackageForm],
  );

  const updateLicenseField = useCallback(
    (key: string, field: string, value: string | boolean) => {
      setPackageForm((prev) => ({
        ...prev,
        licenses: (prev.licenses.length ? prev.licenses : [createEmptyLicense()]).map((license) => {
          if (license.key !== key) return license;
          const next = { ...license, [field]: value };
          if (field === 'type') {
            // 種別変更時に関連フィールドを同期し、矛盾状態（本文必須/不要の不一致）を防ぐ。
            const nextType = String(value || '');
            let nextBody = next.licenseBody;
            let nextCopy = next.copyrights;
            if (nextType === '不明' || nextType === 'その他') {
              next.isCustom = nextType === 'その他';
              if (nextType === '不明') {
                nextBody = '';
              }
              nextCopy = [createEmptyCopyright()];
            } else if (!String(next.licenseBody || '').trim()) {
              next.isCustom = false;
              nextCopy = nextCopy.length ? nextCopy : [createEmptyCopyright()];
            }
            next.licenseBody = nextBody;
            next.copyrights = nextCopy;
          }
          if (field === 'licenseBody' && value && String(value).trim().length > 0) {
            next.isCustom = true;
          }
          return next;
        }),
      }));
    },
    [setPackageForm],
  );

  const toggleLicenseTemplate = useCallback(
    (key: string, useTemplate: boolean) => {
      setPackageForm((prev) => ({
        ...prev,
        licenses: (prev.licenses.length ? prev.licenses : [createEmptyLicense()]).map((license) => {
          if (license.key !== key) return license;
          const forcedCustom = license.type === 'その他';
          const forcedUnknown = license.type === '不明';
          if (forcedUnknown) {
            return {
              ...license,
              isCustom: false,
              licenseBody: '',
            };
          }
          if (forcedCustom) {
            return {
              ...license,
              isCustom: true,
              licenseBody: license.licenseBody || '',
            };
          }
          if (useTemplate) {
            return {
              ...license,
              isCustom: false,
              licenseBody: '',
              copyrights: license.copyrights.length ? license.copyrights : [createEmptyCopyright()],
            };
          }
          return {
            ...license,
            isCustom: true,
            licenseBody: license.licenseBody || '',
          };
        }),
      }));
    },
    [setPackageForm],
  );

  const updateCopyright = useCallback(
    (licenseKey: string, copyrightKey: string, field: string, value: string) => {
      setPackageForm((prev) => ({
        ...prev,
        licenses: (prev.licenses.length ? prev.licenses : [createEmptyLicense()]).map((license) =>
          license.key === licenseKey
            ? {
                ...license,
                copyrights: (license.copyrights.length ? license.copyrights : [createEmptyCopyright()]).map((c) =>
                  c.key === copyrightKey ? { ...c, [field]: value } : c,
                ),
              }
            : license,
        ),
      }));
    },
    [setPackageForm],
  );

  const updateInstallerField = useCallback(
    (field: string, value: string) => {
      setPackageForm((prev) => ({ ...prev, installer: { ...prev.installer, [field]: value } }));
    },
    [setPackageForm],
  );

  const addInstallStep = useCallback(() => {
    setPackageForm((prev) => ({
      ...prev,
      installer: {
        ...prev.installer,
        installSteps: [
          ...prev.installer.installSteps,
          { key: generateKey(), action: 'download', path: '', argsText: '', from: '', to: '', elevate: false },
        ],
      },
    }));
  }, [setPackageForm]);

  const updateInstallStep = useCallback(
    (key: string, field: string, value: string | boolean) => {
      setPackageForm((prev) => ({
        ...prev,
        installer: {
          ...prev.installer,
          installSteps: prev.installer.installSteps.map((step) => {
            if (step.key !== key) return step;
            const next = { ...step, [field]: value };
            if (field === 'action' && value !== 'run') {
              next.elevate = false;
            }
            return next;
          }),
        },
      }));
    },
    [setPackageForm],
  );

  const removeInstallStep = useCallback(
    (key: string) => {
      setPackageForm((prev) => ({
        ...prev,
        installer: {
          ...prev.installer,
          installSteps: prev.installer.installSteps.filter((step) => step.key !== key),
        },
      }));
    },
    [setPackageForm],
  );

  const addUninstallStep = useCallback(() => {
    setPackageForm((prev) => ({
      ...prev,
      installer: {
        ...prev.installer,
        uninstallSteps: [
          ...prev.installer.uninstallSteps,
          { key: generateKey(), action: 'delete', path: '', argsText: '', elevate: false },
        ],
      },
    }));
  }, [setPackageForm]);

  const updateUninstallStep = useCallback(
    (key: string, field: string, value: string | boolean) => {
      setPackageForm((prev) => ({
        ...prev,
        installer: {
          ...prev.installer,
          uninstallSteps: prev.installer.uninstallSteps.map((step) => {
            if (step.key !== key) return step;
            const next = { ...step, [field]: value };
            if (field === 'action' && value !== 'run') {
              next.elevate = false;
            }
            return next;
          }),
        },
      }));
    },
    [setPackageForm],
  );

  const removeUninstallStep = useCallback(
    (key: string) => {
      setPackageForm((prev) => ({
        ...prev,
        installer: {
          ...prev.installer,
          uninstallSteps: prev.installer.uninstallSteps.filter((step) => step.key !== key),
        },
      }));
    },
    [setPackageForm],
  );

  const reorderSteps = useCallback(
    (type: RegisterStepType, from: number, to: number) => {
      if (from === to || from < 0 || typeof to !== 'number' || to < 0) return;
      setPackageForm((prev) => {
        const keyName = type === 'install' ? 'installSteps' : 'uninstallSteps';
        const list = prev.installer[keyName];
        if (from >= list.length) return prev;
        const nextList = [...list];
        const [item] = nextList.splice(from, 1);
        let insertIndex = Math.max(0, Math.min(to, list.length));
        // 同一配列内の再挿入なので、下方向移動時は index を 1 つ補正する。
        if (from < to) insertIndex -= 1;
        insertIndex = Math.max(0, Math.min(insertIndex, nextList.length));
        nextList.splice(insertIndex, 0, item);
        return {
          ...prev,
          installer: {
            ...prev.installer,
            [keyName]: nextList,
          },
        };
      });
    },
    [setPackageForm],
  );

  const addVersion = useCallback(() => {
    const version = createEmptyVersion();
    setPackageForm((prev) => {
      const lastVer = prev.versions[prev.versions.length - 1];
      if (lastVer && Array.isArray(lastVer.files)) {
        version.files = lastVer.files.map((f) => ({
          ...createEmptyVersionFile(),
          path: f.path || '',
        }));
      }
      return { ...prev, versions: [...prev.versions, version] };
    });
    setExpandedVersionKeys((prev) => {
      const next = new Set(prev);
      next.add(version.key);
      return next;
    });
  }, [setExpandedVersionKeys, setPackageForm]);

  return {
    updatePackageField,
    updateLicenseField,
    toggleLicenseTemplate,
    updateCopyright,
    updateInstallerField,
    addInstallStep,
    updateInstallStep,
    removeInstallStep,
    addUninstallStep,
    updateUninstallStep,
    removeUninstallStep,
    reorderSteps,
    addVersion,
  };
}
