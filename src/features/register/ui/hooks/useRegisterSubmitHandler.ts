/**
 * 送信 payload の構築と POST 実行を担当する hook
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { catalogEntrySchema, type CatalogEntry } from '@/utils/catalogSchema';
import { SUBMIT_ACTIONS, buildPackageEntry, buildSourceSubmitPayload, validatePackageForm } from '../../model/form';
import type { RegisterPackageForm } from '../../model/types';
import type { RegisterSuccessDialogState, SubmitPackagePayload } from '../types';
import { SubmitEndpointResponse } from '@/lib/submitEndpoint';

interface UseRegisterSubmitHandlerArgs {
  submitEndpoint: string;
  setCatalogItems: React.Dispatch<React.SetStateAction<CatalogEntry[]>>;
  setSelectedPackageId: React.Dispatch<React.SetStateAction<string>>;
  setSuccessDialog: React.Dispatch<React.SetStateAction<RegisterSuccessDialogState>>;
}

const submitEndpointResponseSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  detail: z.string().optional(),
  pr_url: z.string().optional(),
  public_issue_url: z.string().optional(),
  url: z.string().optional(),
});

export interface SubmitSinglePackageInput {
  packageForm: RegisterPackageForm;
  catalogItems: CatalogEntry[];
  tags: string[];
  packageSender: string;
  syncCatalogState?: boolean;
  openSuccessDialog?: boolean;
}

export interface SubmitSinglePackageResult {
  nextCatalog: CatalogEntry[];
  packageName: string;
  url: string;
}

export default function useRegisterSubmitHandler({
  submitEndpoint,
  setCatalogItems,
  setSelectedPackageId,
  setSuccessDialog,
}: UseRegisterSubmitHandlerArgs) {
  const { t, i18n } = useTranslation(['register', 'common']);
  const submitPackage = useCallback(
    async ({
      packageForm: targetForm,
      catalogItems: targetCatalogItems,
      tags,
      packageSender: targetPackageSender,
      syncCatalogState = true,
      openSuccessDialog = true,
    }: SubmitSinglePackageInput): Promise<SubmitSinglePackageResult> => {
      if (!submitEndpoint) {
        throw new Error(t('common:errors.submitEndpointRequired'));
      }
      if (!/^https:\/\//i.test(submitEndpoint)) {
        throw new Error(t('common:errors.submitEndpointHttps'));
      }
      const validation = validatePackageForm(targetForm);
      if (validation) {
        throw new Error(validation);
      }
      const entryId = targetForm.id.trim();
      const existingIndex = targetCatalogItems.findIndex((item) => item.id === entryId);
      const inherited: Partial<Pick<CatalogEntry, 'popularity' | 'trend'>> = {};
      if (existingIndex >= 0) {
        // popularity/trend はクライアントで再計算しないため、既存値を保持する。
        const existingItem = targetCatalogItems[existingIndex];
        if (existingItem) {
          inherited.popularity = existingItem.popularity;
          inherited.trend = existingItem.trend;
        }
      }
      const entry: CatalogEntry = catalogEntrySchema.parse(buildPackageEntry(targetForm, tags, inherited));
      const mergedCatalog =
        existingIndex >= 0
          ? targetCatalogItems.map((item, idx) => (idx === existingIndex ? entry : item))
          : [...targetCatalogItems, entry];
      const nextCatalog: CatalogEntry[] = mergedCatalog;
      const sourceSubmitPayload = buildSourceSubmitPayload(targetForm, tags, { locale: i18n.language });

      const formData = new FormData();
      for (const sourceFile of sourceSubmitPayload.sourceFiles) {
        formData.append('files[]', sourceFile.file, sourceFile.path);
      }

      const actionLabel = existingIndex >= 0 ? t('page.submitActionUpdate') : t('page.submitActionCreate');
      const packageName = String(entry.name || entry.id || '');
      const packageId = String(entry.id || '');
      const senderName = targetPackageSender.trim();
      const payload: SubmitPackagePayload = {
        action: SUBMIT_ACTIONS.package,
        title: `${actionLabel}：${String(entry.name || '')}`,
        packageId: packageId,
        packageName: String(entry.name || ''),
        packageAuthor: String(entry.author || ''),
        labels: ['package', 'from-client'],
        sourcePaths: sourceSubmitPayload.sourcePaths,
      };
      if (senderName) {
        payload.sender = senderName;
      }
      if (syncCatalogState) {
        setCatalogItems(nextCatalog);
        setSelectedPackageId(packageId);
      }

      formData.append('payload', JSON.stringify(payload));
      const res = await fetch(submitEndpoint, { method: 'POST', body: formData });
      const contentType = res.headers.get('content-type') || '';
      let responseJson: SubmitEndpointResponse | null = null;
      let responseText = '';
      if (contentType.includes('application/json')) {
        const parsed = await res.json().catch(() => null);
        const validated = submitEndpointResponseSchema.safeParse(parsed);
        responseJson = validated.success ? validated.data : null;
      } else if (res.status !== 204) {
        responseText = await res.text().catch(() => '');
      }
      if (!res.ok) {
        const responseError = typeof responseJson?.error === 'string' ? responseJson.error : '';
        const responseMessage = typeof responseJson?.message === 'string' ? responseJson.message : '';
        const responseDetail = typeof responseJson?.detail === 'string' ? responseJson.detail : '';
        const message = responseError || responseMessage || responseDetail || responseText || `HTTP ${res.status}`;
        throw new Error(message);
      }

      const successUrl =
        (typeof responseJson?.pr_url === 'string' && responseJson.pr_url) ||
        (typeof responseJson?.public_issue_url === 'string' && responseJson.public_issue_url) ||
        (typeof responseJson?.url === 'string' && responseJson.url) ||
        '';
      const defaultMessage = t('common:submit.successDefault');
      const friendlyMessage =
        (typeof responseJson?.message === 'string' ? responseJson.message : '') || responseText || defaultMessage;

      if (openSuccessDialog) {
        setSuccessDialog({
          open: true,
          message: friendlyMessage,
          url: successUrl,
          packageAction: actionLabel,
          packageName,
        });
      }
      return {
        nextCatalog,
        packageName,
        url: successUrl,
      };
    },
    [i18n.language, setCatalogItems, setSelectedPackageId, setSuccessDialog, submitEndpoint, t],
  );

  return { submitPackage };
}
