/**
 * 送信 payload の構築と POST 実行を担当する hook
 */
import { useCallback, useMemo } from 'react';
import { SUBMIT_ACTIONS, buildPackageEntry, getFileExtension, validatePackageForm } from '../../model/form';
import { isHttpsUrl } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import type {
  CatalogItem,
  RefCell,
  RegisterSuccessDialogState,
  SubmitEndpointResponse,
  SubmitPackagePayload,
} from '../types';

interface UseRegisterSubmitHandlerArgs {
  packageForm: RegisterPackageForm;
  catalogItems: CatalogItem[];
  tagListRef: RefCell<string[]>;
  packageSender: string;
  submitEndpoint: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setCatalogItems: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  setSelectedPackageId: React.Dispatch<React.SetStateAction<string>>;
  setSuccessDialog: React.Dispatch<React.SetStateAction<RegisterSuccessDialogState>>;
}

export default function useRegisterSubmitHandler({
  packageForm,
  catalogItems,
  tagListRef,
  packageSender,
  submitEndpoint,
  setError,
  setSubmitting,
  setCatalogItems,
  setSelectedPackageId,
  setSuccessDialog,
}: UseRegisterSubmitHandlerArgs) {
  const packageMdFilename = useMemo(() => {
    const id = packageForm.id.trim() || 'package';
    return `${id}.md`;
  }, [packageForm.id]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError('');
      if (!submitEndpoint) {
        setError('VITE_SUBMIT_ENDPOINT が設定されていません。');
        return;
      }
      if (!/^https:\/\//i.test(submitEndpoint)) {
        setError('VITE_SUBMIT_ENDPOINT には https:// で始まるURLを設定してください。');
        return;
      }
      try {
        const validation = validatePackageForm(packageForm);
        if (validation) {
          setError(validation);
          return;
        }
        const entryId = packageForm.id.trim();
        const existingIndex = catalogItems.findIndex((item) => item.id === entryId);
        const inherited: Record<string, unknown> = {};
        if (existingIndex >= 0) {
          // popularity/trend はクライアントで再計算しないため、既存値を保持する。
          const existingItem = catalogItems[existingIndex];
          if (existingItem && Object.prototype.hasOwnProperty.call(existingItem, 'popularity')) {
            inherited.popularity = existingItem.popularity;
          }
          if (existingItem && Object.prototype.hasOwnProperty.call(existingItem, 'trend')) {
            inherited.trend = existingItem.trend;
          }
        }
        const entry: CatalogItem = buildPackageEntry(packageForm, tagListRef.current, inherited);
        const useExternalDescription =
          packageForm.descriptionMode === 'external' && isHttpsUrl(packageForm.descriptionUrl);
        const nextCatalog =
          existingIndex >= 0
            ? catalogItems.map((item, idx) => (idx === existingIndex ? entry : item))
            : [...catalogItems, entry];

        const formData = new FormData();
        let packageAttachmentCount = 0;
        const appendAsset = (file: Blob | File, filename: string, countTowardsLimit = true) => {
          formData.append('files[]', file, filename);
          if (countTowardsLimit) packageAttachmentCount += 1;
        };
        if (!useExternalDescription) {
          const mdBlob = new Blob([packageForm.descriptionText || ''], { type: 'text/markdown' });
          appendAsset(mdBlob, packageMdFilename);
        }
        if (packageForm.images.thumbnail?.file) {
          const ext = getFileExtension(packageForm.images.thumbnail.file.name) || 'png';
          appendAsset(packageForm.images.thumbnail.file, `${entry.id}_thumbnail.${ext}`);
        }
        packageForm.images.info.forEach((entryInfo, idx) => {
          if (entryInfo.file) {
            const ext = getFileExtension(entryInfo.file.name) || 'png';
            appendAsset(entryInfo.file, `${entry.id}_${idx + 1}.${ext}`);
          }
        });
        // 外部 description 利用時のみ、md 添付ゼロを許可する。
        if (packageAttachmentCount === 0 && !useExternalDescription) {
          setError('Markdown と画像ファイルを添付してください');
          return;
        }
        const indexJsonBlob = new Blob([JSON.stringify(nextCatalog, null, 2)], { type: 'application/json' });
        appendAsset(indexJsonBlob, 'index.json', false);

        const actionLabel = existingIndex >= 0 ? 'パッケージ更新' : 'パッケージ追加';
        const packageDialogInfo = {
          actionLabel,
          packageName: String(entry.name || entry.id || ''),
          packageId: String(entry.id || ''),
        };
        const senderName = packageSender.trim();
        const payload: SubmitPackagePayload = {
          action: SUBMIT_ACTIONS.package,
          title: `${actionLabel}: ${String(entry.name || '')}`,
          packageId: String(entry.id || ''),
          packageName: String(entry.name || ''),
          packageAuthor: String(entry.author || ''),
          labels: ['package', 'from-client'],
        };
        if (senderName) {
          payload.sender = senderName;
        }
        setCatalogItems(nextCatalog);
        setSelectedPackageId(String(entry.id || ''));

        formData.append('payload', JSON.stringify(payload));
        setSubmitting(true);
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
        setSuccessDialog({
          open: true,
          message: friendlyMessage,
          url: successUrl,
          packageAction: packageDialogInfo.actionLabel || '',
          packageName: packageDialogInfo.packageName || '',
          packageId: packageDialogInfo.packageId || '',
        });
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : '送信に失敗しました。ネットワークや設定をご確認ください。');
      } finally {
        setSubmitting(false);
      }
    },
    [
      packageForm,
      catalogItems,
      tagListRef,
      packageSender,
      packageMdFilename,
      submitEndpoint,
      setError,
      setSubmitting,
      setCatalogItems,
      setSelectedPackageId,
      setSuccessDialog,
    ],
  );

  return { handleSubmit };
}
