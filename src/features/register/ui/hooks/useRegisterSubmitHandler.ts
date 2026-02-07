/**
 * 送信 payload の構築と POST 実行を担当する hook
 */
import { useCallback } from 'react';
import { SUBMIT_ACTIONS, buildPackageEntry, getFileExtension, validatePackageForm } from '../../model/form';
import { isHttpsUrl } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import type { CatalogItem, RegisterSuccessDialogState, SubmitEndpointResponse, SubmitPackagePayload } from '../types';

interface UseRegisterSubmitHandlerArgs {
  submitEndpoint: string;
  setCatalogItems: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  setSelectedPackageId: React.Dispatch<React.SetStateAction<string>>;
  setSuccessDialog: React.Dispatch<React.SetStateAction<RegisterSuccessDialogState>>;
}

export interface SubmitSinglePackageInput {
  packageForm: RegisterPackageForm;
  catalogItems: CatalogItem[];
  tags: string[];
  packageSender: string;
  syncCatalogState?: boolean;
  openSuccessDialog?: boolean;
}

export interface SubmitSinglePackageResult {
  nextCatalog: CatalogItem[];
  packageId: string;
  packageName: string;
  actionLabel: string;
  message: string;
  url: string;
}

export default function useRegisterSubmitHandler({
  submitEndpoint,
  setCatalogItems,
  setSelectedPackageId,
  setSuccessDialog,
}: UseRegisterSubmitHandlerArgs) {
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
        throw new Error('VITE_SUBMIT_ENDPOINT が設定されていません。');
      }
      if (!/^https:\/\//i.test(submitEndpoint)) {
        throw new Error('VITE_SUBMIT_ENDPOINT には https:// で始まるURLを設定してください。');
      }
      const validation = validatePackageForm(targetForm);
      if (validation) {
        throw new Error(validation);
      }
      const entryId = targetForm.id.trim();
      const existingIndex = targetCatalogItems.findIndex((item) => item.id === entryId);
      const inherited: Record<string, unknown> = {};
      if (existingIndex >= 0) {
        // popularity/trend はクライアントで再計算しないため、既存値を保持する。
        const existingItem = targetCatalogItems[existingIndex];
        if (existingItem && Object.prototype.hasOwnProperty.call(existingItem, 'popularity')) {
          inherited.popularity = existingItem.popularity;
        }
        if (existingItem && Object.prototype.hasOwnProperty.call(existingItem, 'trend')) {
          inherited.trend = existingItem.trend;
        }
      }
      const entry: CatalogItem = buildPackageEntry(targetForm, tags, inherited);
      const useExternalDescription = targetForm.descriptionMode === 'external' && isHttpsUrl(targetForm.descriptionUrl);
      const nextCatalog =
        existingIndex >= 0
          ? targetCatalogItems.map((item, idx) => (idx === existingIndex ? entry : item))
          : [...targetCatalogItems, entry];

      const formData = new FormData();
      let packageAttachmentCount = 0;
      const appendAsset = (file: Blob | File, filename: string, countTowardsLimit = true) => {
        formData.append('files[]', file, filename);
        if (countTowardsLimit) packageAttachmentCount += 1;
      };
      if (!useExternalDescription) {
        const mdBlob = new Blob([targetForm.descriptionText || ''], { type: 'text/markdown' });
        appendAsset(mdBlob, `${entry.id || 'package'}.md`);
      }
      if (targetForm.images.thumbnail?.file) {
        const ext = getFileExtension(targetForm.images.thumbnail.file.name) || 'png';
        appendAsset(targetForm.images.thumbnail.file, `${entry.id}_thumbnail.${ext}`);
      }
      targetForm.images.info.forEach((entryInfo, idx) => {
        if (entryInfo.file) {
          const ext = getFileExtension(entryInfo.file.name) || 'png';
          appendAsset(entryInfo.file, `${entry.id}_${idx + 1}.${ext}`);
        }
      });
      // 外部 description 利用時のみ、md 添付ゼロを許可する。
      if (packageAttachmentCount === 0 && !useExternalDescription) {
        throw new Error('Markdown と画像ファイルを添付してください');
      }
      const indexJsonBlob = new Blob([JSON.stringify(nextCatalog, null, 2)], { type: 'application/json' });
      appendAsset(indexJsonBlob, 'index.json', false);

      const actionLabel = existingIndex >= 0 ? 'パッケージ更新' : 'パッケージ追加';
      const packageName = String(entry.name || entry.id || '');
      const packageId = String(entry.id || '');
      const senderName = targetPackageSender.trim();
      const payload: SubmitPackagePayload = {
        action: SUBMIT_ACTIONS.package,
        title: `${actionLabel}: ${String(entry.name || '')}`,
        packageId: packageId,
        packageName: String(entry.name || ''),
        packageAuthor: String(entry.author || ''),
        labels: ['package', 'from-client'],
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
        responseJson = parsed && typeof parsed === 'object' ? (parsed as SubmitEndpointResponse) : null;
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
      const defaultMessage = '送信が完了しました。';
      const friendlyMessage =
        (typeof responseJson?.message === 'string' ? responseJson.message : '') || responseText || defaultMessage;

      if (openSuccessDialog) {
        setSuccessDialog({
          open: true,
          message: friendlyMessage,
          url: successUrl,
          packageAction: actionLabel,
          packageName,
          packageId,
        });
      }
      return {
        nextCatalog,
        packageId,
        packageName,
        actionLabel,
        message: friendlyMessage,
        url: successUrl,
      };
    },
    [setCatalogItems, setSelectedPackageId, setSuccessDialog, submitEndpoint],
  );

  return { submitPackage };
}
