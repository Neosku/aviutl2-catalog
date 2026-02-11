/**
 * 一時保存からのまとめ送信フローを管理する hook
 */
import { useCallback, useState } from 'react';
import {
  deleteRegisterDraft,
  getRegisterDraftTestStatus,
  isRegisterDraftPending,
  isRegisterDraftReadyForSubmit,
  listRegisterDraftRecords,
  restoreRegisterDraft,
  updateRegisterDraftSubmitState,
} from '../../model/draft';
import { cleanupImagePreviews } from '../../model/helpers';
import type { CatalogItem, RegisterSuccessDialogState } from '../types';
import type { SubmitSinglePackageInput, SubmitSinglePackageResult } from './useRegisterSubmitHandler';

interface UseRegisterBatchSubmitArgs {
  catalogItems: CatalogItem[];
  setCatalogItems: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  submitPackage: (input: SubmitSinglePackageInput) => Promise<SubmitSinglePackageResult>;
  flushAutoSaveNow: () => void;
  reloadDraftPackages: () => void;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setSuccessDialog: React.Dispatch<React.SetStateAction<RegisterSuccessDialogState>>;
}

export default function useRegisterBatchSubmit({
  catalogItems,
  setCatalogItems,
  submitPackage,
  flushAutoSaveNow,
  reloadDraftPackages,
  setError,
  setSubmitting,
  setSuccessDialog,
}: UseRegisterBatchSubmitArgs) {
  const [submitProgressText, setSubmitProgressText] = useState('');

  const handleSubmitAllDrafts = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        setError('');
        flushAutoSaveNow();
        const pendingDrafts = listRegisterDraftRecords().filter(isRegisterDraftPending);
        if (pendingDrafts.length === 0) {
          return;
        }
        const blockedDrafts = pendingDrafts.filter((draft) => !isRegisterDraftReadyForSubmit(draft));
        if (blockedDrafts.length > 0) {
          const blockedLabels = blockedDrafts.map((draft) => {
            const status = getRegisterDraftTestStatus(draft);
            const missing: string[] = [];
            if (!status.installerReady) missing.push('install');
            if (!status.uninstallerReady) missing.push('uninstall');
            return `${draft.packageId}(${missing.join('/')})`;
          });
          const preview = blockedLabels.slice(0, 4).join(', ');
          const suffix = blockedLabels.length > 4 ? ` ほか${blockedLabels.length - 4}件` : '';
          setError(`テスト未完了のため送信できません: ${preview}${suffix}`);
          return;
        }
        setSubmitting(true);
        let workingCatalog = catalogItems;
        let successCount = 0;
        let failureCount = 0;
        let lastSuccessUrl = '';
        let lastSuccessName = '';
        let firstError = '';
        for (let i = 0; i < pendingDrafts.length; i += 1) {
          const draft = pendingDrafts[i];
          setSubmitProgressText(`${i + 1} / ${pendingDrafts.length}`);
          let restored: Awaited<ReturnType<typeof restoreRegisterDraft>> | null = null;
          try {
            restored = await restoreRegisterDraft(draft);
            const submitResult = await submitPackage({
              packageForm: restored.packageForm,
              catalogItems: workingCatalog,
              tags: restored.tags,
              packageSender: restored.packageSender,
              syncCatalogState: false,
              openSuccessDialog: false,
            });
            workingCatalog = submitResult.nextCatalog;
            lastSuccessUrl = submitResult.url || lastSuccessUrl;
            lastSuccessName = submitResult.packageName || lastSuccessName;
            successCount += 1;
            deleteRegisterDraft(draft.draftId);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : '送信に失敗しました。ネットワークや設定をご確認ください。';
            failureCount += 1;
            updateRegisterDraftSubmitState({
              draftId: draft.draftId,
              errorMessage: message,
            });
            if (!firstError) {
              firstError = `${draft.packageId}: ${message}`;
            }
          } finally {
            if (restored) {
              cleanupImagePreviews(restored.packageForm.images);
            }
          }
        }
        if (successCount > 0) {
          setCatalogItems(workingCatalog);
          setSuccessDialog({
            open: true,
            message:
              failureCount > 0
                ? `${successCount}件の送信が完了しました。${failureCount}件は失敗しました。`
                : `${successCount}件の送信が完了しました。`,
            url: lastSuccessUrl,
            packageName: successCount === 1 ? lastSuccessName : `${successCount}件`,
            packageAction: successCount === 1 ? '送信完了' : 'まとめて送信完了',
            packageId: '',
          });
        }
        if (failureCount > 0) {
          setError(firstError || `${failureCount}件の送信に失敗しました。`);
        } else {
          setError('');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '送信処理に失敗しました。');
      } finally {
        setSubmitting(false);
        setSubmitProgressText('');
        reloadDraftPackages();
      }
    },
    [
      catalogItems,
      flushAutoSaveNow,
      reloadDraftPackages,
      setCatalogItems,
      setError,
      setSubmitting,
      setSuccessDialog,
      submitPackage,
    ],
  );

  return {
    submitProgressText,
    handleSubmitAllDrafts,
  };
}
