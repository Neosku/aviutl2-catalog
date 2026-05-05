import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isRegisterDraftPending,
  listRegisterDraftRecords,
  saveRegisterDraft,
  type RegisterDraftRecord,
} from '../../model/draft';
import { resolveRegisterDraftTestState } from '../../model/registerTestRequirement';
import type { RegisterCatalogItem, RegisterPackageForm } from '../../model/types';
import type { RegisterDraftListItemView } from '../types';

function toDraftListItem(record: RegisterDraftRecord, catalogItems: RegisterCatalogItem[]): RegisterDraftListItemView {
  const testStatus = resolveRegisterDraftTestState({
    catalogItems,
    packageId: record.packageId,
    installerTestedHash: record.installerTestedHash,
    uninstallerTestedHash: record.uninstallerTestedHash,
    packageForm: {
      id: record.form.id,
      installer: record.form.installer,
      versions: record.form.versions,
    },
  });
  return {
    draftId: record.draftId,
    packageId: record.packageId,
    packageName: record.packageName,
    savedAt: record.savedAt,
    pending: isRegisterDraftPending(record),
    readyForSubmit: testStatus.installerReady && testStatus.uninstallerReady,
    testStatus: testStatus.state,
    lastSubmitError: String(record.lastSubmitError || ''),
  };
}

interface UseRegisterDraftPersistenceArgs {
  packageForm: RegisterPackageForm;
  packageSender: string;
  currentTags: string[];
  userEditToken: number;
  draftPackageId: string;
  catalogItems: RegisterCatalogItem[];
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export default function useRegisterDraftPersistence({
  packageForm,
  packageSender,
  currentTags,
  userEditToken,
  draftPackageId,
  catalogItems,
  setError,
}: UseRegisterDraftPersistenceArgs) {
  const { t } = useTranslation('register');
  const [draftPackages, setDraftPackages] = useState<RegisterDraftListItemView[]>(() =>
    listRegisterDraftRecords().map((record) => toDraftListItem(record, catalogItems)),
  );
  const suspendAutoSaveUntilRef = useRef(Date.now() + 600);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestUserEditTokenRef = useRef(userEditToken);
  const persistedUserEditTokenRef = useRef(userEditToken);
  const activeDraftIdRef = useRef('');
  const didHydrateDraftPackagesRef = useRef(false);

  useEffect(() => {
    latestUserEditTokenRef.current = userEditToken;
  }, [userEditToken]);

  const reloadDraftPackages = useCallback(() => {
    setDraftPackages(listRegisterDraftRecords().map((record) => toDraftListItem(record, catalogItems)));
  }, [catalogItems]);

  useEffect(() => {
    if (!didHydrateDraftPackagesRef.current) {
      didHydrateDraftPackagesRef.current = true;
      return;
    }
    reloadDraftPackages();
  }, [reloadDraftPackages]);

  const suspendNextAutoSave = useCallback((durationMs = 250) => {
    const until = Date.now() + Math.max(50, durationMs);
    suspendAutoSaveUntilRef.current = Math.max(suspendAutoSaveUntilRef.current, until);
  }, []);

  const hasUnsavedUserEdits = useCallback(() => latestUserEditTokenRef.current > persistedUserEditTokenRef.current, []);

  const markUserEditsAsHandled = useCallback(() => {
    persistedUserEditTokenRef.current = latestUserEditTokenRef.current;
  }, []);

  const upsertDraftRecord = useCallback(
    (record: RegisterDraftRecord) => {
      const nextItem = toDraftListItem(record, catalogItems);
      setDraftPackages((prev) => {
        const filtered = prev.filter((item) => item.draftId !== nextItem.draftId);
        return [nextItem, ...filtered];
      });
    },
    [catalogItems],
  );

  const removeDraftListItem = useCallback((draftId: string) => {
    setDraftPackages((prev) => prev.filter((item) => item.draftId !== draftId));
  }, []);

  const persistCurrentDraft = useCallback((): void => {
    const packageId = String(draftPackageId || '').trim() || String(packageForm.id || '').trim();
    if (!packageId) return;
    const record = saveRegisterDraft({
      packageForm,
      tags: currentTags,
      packageSender,
      draftId: activeDraftIdRef.current,
      packageId,
    });
    activeDraftIdRef.current = record.draftId;
    upsertDraftRecord(record);
    markUserEditsAsHandled();
  }, [currentTags, draftPackageId, markUserEditsAsHandled, packageForm, packageSender, upsertDraftRecord]);

  const clearPendingAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  const flushAutoSaveNow = useCallback(() => {
    clearPendingAutoSave();
    if (!hasUnsavedUserEdits()) return;
    persistCurrentDraft();
  }, [clearPendingAutoSave, hasUnsavedUserEdits, persistCurrentDraft]);

  useEffect(() => {
    if (!hasUnsavedUserEdits()) return;
    const packageId = String(draftPackageId || '').trim() || String(packageForm.id || '').trim();
    if (!packageId) return;
    clearPendingAutoSave();
    const waitMs = Math.max(800, suspendAutoSaveUntilRef.current - Date.now() + 50);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      if (!hasUnsavedUserEdits()) return;
      try {
        persistCurrentDraft();
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.draftSaveFailed');
        setError(message);
      }
    }, waitMs);
    return clearPendingAutoSave;
  }, [
    clearPendingAutoSave,
    currentTags,
    draftPackageId,
    hasUnsavedUserEdits,
    packageForm,
    packageSender,
    persistCurrentDraft,
    setError,
  ]);

  const flushBeforeNavigation = useCallback((): boolean => {
    clearPendingAutoSave();
    if (!hasUnsavedUserEdits()) return true;
    try {
      persistCurrentDraft();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.draftSaveFailed');
      setError(message);
      return false;
    }
  }, [clearPendingAutoSave, hasUnsavedUserEdits, persistCurrentDraft, setError, t]);

  const pendingDraftPackages = useMemo(() => draftPackages.filter((item) => item.pending), [draftPackages]);
  const pendingSubmitCount = useMemo(
    () => pendingDraftPackages.filter((item) => item.readyForSubmit).length,
    [pendingDraftPackages],
  );
  const blockedSubmitCount = useMemo(
    () => pendingDraftPackages.length - pendingSubmitCount,
    [pendingDraftPackages, pendingSubmitCount],
  );

  return {
    activeDraftIdRef,
    pendingDraftPackages,
    pendingSubmitCount,
    blockedSubmitCount,
    reloadDraftPackages,
    removeDraftListItem,
    upsertDraftRecord,
    markUserEditsAsHandled,
    suspendNextAutoSave,
    clearPendingAutoSave,
    flushAutoSaveNow,
    flushBeforeNavigation,
  };
}
