/**
 * 一時保存・自動保存・復元フローを管理する hook
 */
import { useCallback, useMemo } from 'react';
import {
  deleteRegisterDraft,
  getRegisterDraft,
  getRegisterDraftById,
  updateRegisterDraftTestState,
  type RegisterDraftTestKind,
} from '../../model/draft';
import { computeRegisterRelevantHash } from '../../model/registerTestRequirement';
import type { RegisterCatalogItem, RegisterPackageForm } from '../../model/types';
import type { RegisterMarkdownTab } from '../types';
import useRegisterDraftPersistence from './useRegisterDraftPersistence';
import useRegisterDraftRestore from './useRegisterDraftRestore';

interface UseRegisterDraftStateArgs {
  packageForm: RegisterPackageForm;
  packageSender: string;
  currentTags: string[];
  userEditToken: number;
  selectedPackageId: string;
  catalogItems: RegisterCatalogItem[];
  setSelectedPackageId: React.Dispatch<React.SetStateAction<string>>;
  getCatalogPackageById: (packageId: string) => RegisterCatalogItem | null;
  onSelectCatalogPackage: (item: RegisterCatalogItem | null) => void;
  onStartCatalogNewPackage: () => void;
  applyTagList: (list: string[]) => void;
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setPackageSender: React.Dispatch<React.SetStateAction<string>>;
  setDescriptionTab: React.Dispatch<React.SetStateAction<RegisterMarkdownTab>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export default function useRegisterDraftState({
  packageForm,
  packageSender,
  currentTags,
  userEditToken,
  selectedPackageId,
  catalogItems,
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
  const draftPackageId = useMemo(() => {
    const normalizedSelectedId = String(selectedPackageId || '').trim();
    if (normalizedSelectedId && getCatalogPackageById(normalizedSelectedId)) {
      return normalizedSelectedId;
    }
    return String(packageForm.id || '').trim();
  }, [getCatalogPackageById, packageForm.id, selectedPackageId]);

  const {
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
  } = useRegisterDraftPersistence({
    packageForm,
    packageSender,
    currentTags,
    userEditToken,
    draftPackageId,
    catalogItems,
    setError,
  });

  const { handleOpenDraftPackage: restoreDraftPackage, restoreDraftForPackage } = useRegisterDraftRestore({
    selectedPackageId,
    setSelectedPackageId,
    setPackageForm,
    setPackageSender,
    setDescriptionTab,
    setExpandedVersionKeys,
    setError,
    applyTagList,
    suspendNextAutoSave,
    activeDraftIdRef,
    reloadDraftPackages,
  });

  const handleSelectPackage = useCallback(
    (item: RegisterCatalogItem | null) => {
      if (!flushBeforeNavigation()) return;
      suspendNextAutoSave();
      onSelectCatalogPackage(item);
      if (!item) {
        activeDraftIdRef.current = '';
        return;
      }
      activeDraftIdRef.current = String(getRegisterDraft(item.id)?.draftId || '').trim();
    },
    [activeDraftIdRef, flushBeforeNavigation, onSelectCatalogPackage, suspendNextAutoSave],
  );

  const handleStartNewPackage = useCallback(() => {
    if (!flushBeforeNavigation()) return;
    suspendNextAutoSave();
    activeDraftIdRef.current = '';
    onStartCatalogNewPackage();
  }, [activeDraftIdRef, flushBeforeNavigation, onStartCatalogNewPackage, suspendNextAutoSave]);

  const handleDeleteDraftPackage = useCallback(
    (draftId: string) => {
      const targetDraftId = draftId.trim();
      if (!targetDraftId) return;
      const targetDraft = getRegisterDraftById(targetDraftId);
      const targetPackageId = String(targetDraft?.packageId || '').trim();
      deleteRegisterDraft(targetDraftId);
      removeDraftListItem(targetDraftId);

      const selectedId = selectedPackageId.trim();
      const isActiveDraft = activeDraftIdRef.current === targetDraftId;
      const isSelectedPackageDraft = targetPackageId && selectedId === targetPackageId;
      if (!isActiveDraft && !isSelectedPackageDraft) return;

      clearPendingAutoSave();
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
      activeDraftIdRef,
      clearPendingAutoSave,
      getCatalogPackageById,
      markUserEditsAsHandled,
      onSelectCatalogPackage,
      onStartCatalogNewPackage,
      removeDraftListItem,
      selectedPackageId,
      setError,
      suspendNextAutoSave,
    ],
  );

  const handleOpenDraftPackage = useCallback(
    async (draftId: string) => {
      if (!flushBeforeNavigation()) return;
      await restoreDraftPackage(draftId);
    },
    [flushBeforeNavigation, restoreDraftPackage],
  );

  const reapplyDraftForPackage = useCallback(
    async (packageId: string) => {
      clearPendingAutoSave();
      suspendNextAutoSave();
      await restoreDraftForPackage(packageId);
    },
    [clearPendingAutoSave, restoreDraftForPackage, suspendNextAutoSave],
  );

  const markCurrentDraftTestPassed = useCallback(
    (kind: RegisterDraftTestKind) => {
      const packageId = String(draftPackageId || '').trim();
      if (!packageId) return;
      let draftId = String(activeDraftIdRef.current || '').trim();
      if (!draftId) {
        const latest = getRegisterDraft(packageId);
        if (!latest) return;
        draftId = latest.draftId;
        activeDraftIdRef.current = draftId;
      }
      const testedHash = computeRegisterRelevantHash(packageForm);
      const updated = updateRegisterDraftTestState({
        draftId,
        kind,
        testedHash,
      });
      if (!updated) return;
      upsertDraftRecord(updated);
    },
    [activeDraftIdRef, draftPackageId, packageForm, upsertDraftRecord],
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
    reapplyDraftForPackage,
  };
}
