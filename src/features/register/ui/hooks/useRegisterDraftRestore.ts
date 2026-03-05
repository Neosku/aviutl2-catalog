import { useCallback, useEffect, useRef } from 'react';
import {
  getRegisterDraft,
  getRegisterDraftById,
  isRegisterDraftPending,
  restoreRegisterDraft,
} from '../../model/draft';
import { cleanupImagePreviews } from '../../model/helpers';
import type { RegisterDraftRecord } from '../../model/draft';
import type { RegisterPackageForm } from '../../model/types';

interface UseRegisterDraftRestoreArgs {
  selectedPackageId: string;
  setSelectedPackageId: React.Dispatch<React.SetStateAction<string>>;
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setPackageSender: React.Dispatch<React.SetStateAction<string>>;
  setDescriptionTab: React.Dispatch<React.SetStateAction<string>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  applyTagList: (list: string[]) => void;
  suspendNextAutoSave: (durationMs?: number) => void;
  activeDraftIdRef: React.MutableRefObject<string>;
  reloadDraftPackages: () => void;
}

export default function useRegisterDraftRestore({
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
}: UseRegisterDraftRestoreArgs) {
  const draftRestoreTokenRef = useRef(0);
  const skipNextSelectedRestoreIdRef = useRef('');

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
      activeDraftIdRef,
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
    const normalizedSelectedId = String(selectedPackageId || '').trim();
    if (!normalizedSelectedId) return;
    if (skipNextSelectedRestoreIdRef.current && skipNextSelectedRestoreIdRef.current === normalizedSelectedId) {
      skipNextSelectedRestoreIdRef.current = '';
      return;
    }
    const draft = getRegisterDraft(normalizedSelectedId);
    if (!draft) {
      activeDraftIdRef.current = '';
      return;
    }
    activeDraftIdRef.current = draft.draftId;
    if (!isRegisterDraftPending(draft)) return;
    void applyDraftRecord(draft);
  }, [activeDraftIdRef, applyDraftRecord, selectedPackageId]);

  const handleOpenDraftPackage = useCallback(
    async (draftId: string) => {
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
    [applyDraftRecord, reloadDraftPackages, setError, setSelectedPackageId],
  );

  return {
    handleOpenDraftPackage,
  };
}
