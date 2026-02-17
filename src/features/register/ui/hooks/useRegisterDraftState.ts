/**
 * 一時保存・自動保存・復元フローを管理する hook
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeRegisterDraftContentHash,
  deleteRegisterDraft,
  getRegisterDraft,
  getRegisterDraftById,
  isRegisterDraftPending,
  isRegisterDraftReadyForSubmit,
  listRegisterDrafts,
  restoreRegisterDraft,
  saveRegisterDraft,
  updateRegisterDraftTestState,
  type RegisterDraftRecord,
  type RegisterDraftTestKind,
} from '../../model/draft';
import { cleanupImagePreviews } from '../../model/helpers';
import type { CatalogEntry } from '../../../../utils/catalogSchema.js';
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

interface UseRegisterDraftStateArgs {
  packageForm: RegisterPackageForm;
  packageSender: string;
  currentTags: string[];
  userEditToken: number;
  selectedPackageId: string;
  setSelectedPackageId: React.Dispatch<React.SetStateAction<string>>;
  getCatalogPackageById: (packageId: string) => CatalogEntry | null;
  onSelectCatalogPackage: (item: CatalogEntry | null) => void;
  onStartCatalogNewPackage: () => void;
  applyTagList: (list: string[]) => void;
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setPackageSender: React.Dispatch<React.SetStateAction<string>>;
  setDescriptionTab: React.Dispatch<React.SetStateAction<string>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export default function useRegisterDraftState({
  packageForm,
  packageSender,
  currentTags,
  userEditToken,
  selectedPackageId,
  setSelectedPackageId,
  getCatalogPackageById,
  onSelectCatalogPackage,
  onStartCatalogNewPackage,
  applyTagList,
  setPackageForm,
  setPackageSender,
  setDescriptionTab,
  setExpandedVersionKeys,
  setError,
}: UseRegisterDraftStateArgs) {
  const [draftPackages, setDraftPackages] = useState<RegisterDraftListItemView[]>(() => listRegisterDrafts());
  const draftRestoreTokenRef = useRef(0);
  const skipNextSelectedRestoreIdRef = useRef('');
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
    const nextItem = toDraftListItem(record);
    setDraftPackages((prev) => {
      const filtered = prev.filter((item) => item.draftId !== nextItem.draftId);
      return [nextItem, ...filtered];
    });
    markUserEditsAsHandled();
  }, [currentTags, markUserEditsAsHandled, packageForm, packageSender]);

  const flushAutoSaveNow = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (!hasUnsavedUserEdits()) return;
    persistCurrentDraft();
  }, [hasUnsavedUserEdits, persistCurrentDraft]);

  const applyDraftRecord = useCallback(
    async (draft: RegisterDraftRecord) => {
      suspendNextAutoSave();
      const token = draftRestoreTokenRef.current + 1;
      draftRestoreTokenRef.current = token;
      const restored = await restoreRegisterDraft(draft);
      if (draftRestoreTokenRef.current !== token) {
        cleanupImagePreviews(restored.packageForm.images);
        return;
      }
      activeDraftIdRef.current = draft.draftId;
      setPackageForm((prev) => {
        cleanupImagePreviews(prev.images);
        return restored.packageForm;
      });
      applyTagList(restored.tags);
      setPackageSender(restored.packageSender);
      setDescriptionTab('edit');
      setExpandedVersionKeys(new Set());
      if (restored.warnings.length > 0) {
        setError(restored.warnings[0]);
      } else {
        setError('');
      }
    },
    [
      applyTagList,
      setDescriptionTab,
      setError,
      setExpandedVersionKeys,
      setPackageForm,
      setPackageSender,
      suspendNextAutoSave,
    ],
  );

  useEffect(() => {
    const selectedId = String(selectedPackageId || '').trim();
    if (!selectedId) {
      return;
    }
    if (skipNextSelectedRestoreIdRef.current && skipNextSelectedRestoreIdRef.current === selectedId) {
      skipNextSelectedRestoreIdRef.current = '';
      return;
    }
    const draft = getRegisterDraft(selectedId);
    if (!draft) {
      activeDraftIdRef.current = '';
      return;
    }
    activeDraftIdRef.current = draft.draftId;
    if (!isRegisterDraftPending(draft)) {
      return;
    }
    void applyDraftRecord(draft);
  }, [selectedPackageId, applyDraftRecord]);

  useEffect(() => {
    if (!hasUnsavedUserEdits()) return;
    const packageId = String(packageForm.id || '').trim();
    if (!packageId) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
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
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [currentTags, hasUnsavedUserEdits, packageForm, packageSender, persistCurrentDraft, setError, userEditToken]);

  const flushBeforeNavigation = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (!hasUnsavedUserEdits()) return;
    try {
      persistCurrentDraft();
    } catch (err) {
      const message = err instanceof Error ? err.message : '一時保存に失敗しました。';
      setError(message);
    } finally {
      markUserEditsAsHandled();
    }
  }, [hasUnsavedUserEdits, markUserEditsAsHandled, persistCurrentDraft, setError]);

  const handleSelectPackage = useCallback(
    (item: CatalogEntry | null) => {
      flushBeforeNavigation();
      suspendNextAutoSave();
      onSelectCatalogPackage(item);
      if (!item) {
        activeDraftIdRef.current = '';
        return;
      }
      activeDraftIdRef.current = String(getRegisterDraft(item.id)?.draftId || '').trim();
    },
    [flushBeforeNavigation, onSelectCatalogPackage, suspendNextAutoSave],
  );

  const handleStartNewPackage = useCallback(() => {
    flushBeforeNavigation();
    suspendNextAutoSave();
    activeDraftIdRef.current = '';
    onStartCatalogNewPackage();
  }, [flushBeforeNavigation, onStartCatalogNewPackage, suspendNextAutoSave]);

  const handleDeleteDraftPackage = useCallback(
    (draftId: string) => {
      const targetDraftId = draftId.trim();
      if (!targetDraftId) return;
      const targetDraft = getRegisterDraftById(targetDraftId);
      const targetPackageId = String(targetDraft?.packageId || '').trim();
      deleteRegisterDraft(targetDraftId);
      setDraftPackages((prev) => prev.filter((item) => item.draftId !== targetDraftId));

      const selectedId = selectedPackageId.trim();
      const isActiveDraft = activeDraftIdRef.current === targetDraftId;
      const isSelectedPackageDraft = targetPackageId && selectedId === targetPackageId;
      if (!isActiveDraft && !isSelectedPackageDraft) return;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      activeDraftIdRef.current = '';
      markUserEditsAsHandled();
      suspendNextAutoSave();

      const catalogItem = getCatalogPackageById(targetPackageId);
      if (catalogItem) {
        onSelectCatalogPackage(catalogItem);
      } else {
        onStartCatalogNewPackage();
      }
      setError('');
    },
    [
      getCatalogPackageById,
      markUserEditsAsHandled,
      onSelectCatalogPackage,
      onStartCatalogNewPackage,
      selectedPackageId,
      setError,
      suspendNextAutoSave,
    ],
  );

  const handleOpenDraftPackage = useCallback(
    async (draftId: string) => {
      flushBeforeNavigation();
      const draft = getRegisterDraftById(draftId);
      if (!draft) {
        reloadDraftPackages();
        setError('対象の一時保存が見つかりませんでした。');
        return;
      }
      skipNextSelectedRestoreIdRef.current = draft.packageId;
      setSelectedPackageId(draft.packageId);
      await applyDraftRecord(draft);
    },
    [applyDraftRecord, flushBeforeNavigation, reloadDraftPackages, setError, setSelectedPackageId],
  );

  const markCurrentDraftTestPassed = useCallback(
    (kind: RegisterDraftTestKind) => {
      const packageId = String(packageForm.id || '').trim();
      if (!packageId) return;
      let draftId = String(activeDraftIdRef.current || '').trim();
      if (!draftId) {
        const latest = getRegisterDraft(packageId);
        if (!latest) return;
        draftId = latest.draftId;
        activeDraftIdRef.current = draftId;
      }
      const testedHash = computeRegisterDraftContentHash({
        packageForm,
        tags: currentTags,
        packageSender,
      });
      const updated = updateRegisterDraftTestState({
        draftId,
        kind,
        testedHash,
      });
      if (!updated) return;
      const nextItem = toDraftListItem(updated);
      setDraftPackages((prev) => {
        const filtered = prev.filter((item) => item.draftId !== nextItem.draftId);
        return [nextItem, ...filtered];
      });
    },
    [currentTags, packageForm, packageSender],
  );

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
    pendingDraftPackages,
    pendingSubmitCount,
    blockedSubmitCount,
    reloadDraftPackages,
    flushAutoSaveNow,
    markCurrentDraftTestPassed,
    handleSelectPackage,
    handleStartNewPackage,
    handleOpenDraftPackage,
    handleDeleteDraftPackage,
  };
}
