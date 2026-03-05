import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  isRegisterDraftPending,
  isRegisterDraftReadyForSubmit,
  listRegisterDrafts,
  saveRegisterDraft,
  type RegisterDraftRecord,
} from '../../model/draft';
import type { RegisterPackageForm } from '../../model/types';
import type { RegisterDraftListItemView } from '../types';

function toDraftListItem(record: RegisterDraftRecord): RegisterDraftListItemView {
  return {
    draftId: record.draftId,
    packageId: record.packageId,
    packageName: record.packageName,
    savedAt: record.savedAt,
    pending: isRegisterDraftPending(record),
    readyForSubmit: isRegisterDraftReadyForSubmit(record),
    lastSubmitError: String(record.lastSubmitError || ''),
  };
}

interface UseRegisterDraftPersistenceArgs {
  packageForm: RegisterPackageForm;
  packageSender: string;
  currentTags: string[];
  userEditToken: number;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export default function useRegisterDraftPersistence({
  packageForm,
  packageSender,
  currentTags,
  userEditToken,
  setError,
}: UseRegisterDraftPersistenceArgs) {
  const [draftPackages, setDraftPackages] = useState<RegisterDraftListItemView[]>(() => listRegisterDrafts());
  const suspendAutoSaveUntilRef = useRef(Date.now() + 600);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestUserEditTokenRef = useRef(userEditToken);
  const persistedUserEditTokenRef = useRef(userEditToken);
  const activeDraftIdRef = useRef('');

  useEffect(() => {
    latestUserEditTokenRef.current = userEditToken;
  }, [userEditToken]);

  const reloadDraftPackages = useCallback(() => {
    setDraftPackages(listRegisterDrafts());
  }, []);

  const suspendNextAutoSave = useCallback((durationMs = 250) => {
    const until = Date.now() + Math.max(50, durationMs);
    suspendAutoSaveUntilRef.current = Math.max(suspendAutoSaveUntilRef.current, until);
  }, []);

  const hasUnsavedUserEdits = useCallback(() => latestUserEditTokenRef.current > persistedUserEditTokenRef.current, []);

  const markUserEditsAsHandled = useCallback(() => {
    persistedUserEditTokenRef.current = latestUserEditTokenRef.current;
  }, []);

  const upsertDraftRecord = useCallback((record: RegisterDraftRecord) => {
    const nextItem = toDraftListItem(record);
    setDraftPackages((prev) => {
      const filtered = prev.filter((item) => item.draftId !== nextItem.draftId);
      return [nextItem, ...filtered];
    });
  }, []);

  const removeDraftListItem = useCallback((draftId: string) => {
    setDraftPackages((prev) => prev.filter((item) => item.draftId !== draftId));
  }, []);

  const persistCurrentDraft = useCallback((): void => {
    const packageId = String(packageForm.id || '').trim();
    if (!packageId) return;
    const record = saveRegisterDraft({
      packageForm,
      tags: currentTags,
      packageSender,
      draftId: activeDraftIdRef.current,
    });
    activeDraftIdRef.current = record.draftId;
    upsertDraftRecord(record);
    markUserEditsAsHandled();
  }, [currentTags, markUserEditsAsHandled, packageForm, packageSender, upsertDraftRecord]);

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
    const packageId = String(packageForm.id || '').trim();
    if (!packageId) return;
    clearPendingAutoSave();
    const waitMs = Math.max(800, suspendAutoSaveUntilRef.current - Date.now() + 50);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      if (!hasUnsavedUserEdits()) return;
      try {
        persistCurrentDraft();
      } catch (err) {
        const message = err instanceof Error ? err.message : '一時保存に失敗しました。';
        setError(message);
      }
    }, waitMs);
    return clearPendingAutoSave;
  }, [
    clearPendingAutoSave,
    currentTags,
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
      const message = err instanceof Error ? err.message : '一時保存に失敗しました。';
      setError(message);
      return false;
    }
  }, [clearPendingAutoSave, hasUnsavedUserEdits, persistCurrentDraft, setError]);

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
