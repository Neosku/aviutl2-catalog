/**
 * 一時保存からのまとめ送信フローを管理する hook
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  deleteRegisterDraft,
  isRegisterDraftPending,
  listRegisterDraftRecords,
  restoreRegisterDraft,
  updateRegisterDraftSubmitState,
} from '../../model/draft';
import { cleanupImagePreviews } from '../../model/helpers';
import { resolveRegisterDraftTestState } from '../../model/registerTestRequirement';
import type { RegisterCatalogItem } from '../../model/types';
import type { RegisterSuccessDialogState } from '../types';
import type { SubmitSinglePackageInput, SubmitSinglePackageResult } from './useRegisterSubmitHandler';

interface UseRegisterBatchSubmitArgs {
  catalogItems: RegisterCatalogItem[];
  setCatalogItems: React.Dispatch<React.SetStateAction<RegisterCatalogItem[]>>;
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
  const { t } = useTranslation(['register', 'common']);
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
        const blockedDrafts = pendingDrafts.filter((draft) => {
          const status = resolveRegisterDraftTestState({
            catalogItems,
            packageId: draft.packageId,
            installerTestedHash: draft.installerTestedHash,
            uninstallerTestedHash: draft.uninstallerTestedHash,
            packageForm: {
              id: draft.form.id,
              installer: draft.form.installer,
              versions: draft.form.versions,
            },
          });
          return !status.installerReady || !status.uninstallerReady;
        });
        if (blockedDrafts.length > 0) {
          const blockedLabels = blockedDrafts.map((draft) => {
            const status = resolveRegisterDraftTestState({
              catalogItems,
              packageId: draft.packageId,
              installerTestedHash: draft.installerTestedHash,
              uninstallerTestedHash: draft.uninstallerTestedHash,
              packageForm: {
                id: draft.form.id,
                installer: draft.form.installer,
                versions: draft.form.versions,
              },
            });
            const missing: string[] = [];
            if (!status.installerReady) missing.push('install');
            if (!status.uninstallerReady) missing.push('uninstall');
            return `${draft.packageId}(${missing.join('/')})`;
          });
          const preview = blockedLabels.slice(0, 4).join(', ');
          const suffix = blockedLabels.length > 4 ? t('errors.batchSuffix', { count: blockedLabels.length - 4 }) : '';
          setError(t('errors.batchBlocked', { preview: `${preview}${suffix}` }));
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
            const message = err instanceof Error ? err.message : t('common:errors.submitFailed');
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
                ? t('errors.batchCompletedWithFailure', { success: successCount, failure: failureCount })
                : t('errors.batchCompleted', { success: successCount }),
            url: lastSuccessUrl,
            packageName: successCount === 1 ? lastSuccessName : t('errors.batchCountLabel', { count: successCount }),
            packageAction: successCount === 1 ? t('common:submit.completeTitle') : t('page.successActionBatch'),
          });
        }
        if (failureCount > 0) {
          setError(firstError || t('errors.batchFailed', { count: failureCount }));
        } else {
          setError('');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.submitProcessFailed'));
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
      t,
    ],
  );

  return {
    submitProgressText,
    handleSubmitAllDrafts,
  };
}
