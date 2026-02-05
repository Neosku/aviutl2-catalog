/**
 * 詳細説明入力の状態とプレビュー生成を扱う hook
 */
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { renderMarkdown } from '../../../../utils/markdown.js';
import { getDescriptionSourceUrl, isHttpsUrl } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';

interface UseRegisterDescriptionStateArgs {
  packageForm: RegisterPackageForm;
  catalogBaseUrl: string;
  descriptionTab: string;
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
}

export default function useRegisterDescriptionState({
  packageForm,
  catalogBaseUrl,
  descriptionTab,
  setPackageForm,
}: UseRegisterDescriptionStateArgs) {
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [descriptionPreviewHtml, setDescriptionPreviewHtml] = useState('');
  const [externalDescriptionText, setExternalDescriptionText] = useState('');
  const [externalDescriptionStatus, setExternalDescriptionStatus] = useState('idle');

  const isExternalDescription = packageForm.descriptionMode === 'external';
  const descriptionPreviewSource = isExternalDescription ? externalDescriptionText : packageForm.descriptionText;
  const deferredDescriptionText = useDeferredValue(descriptionTab === 'preview' ? descriptionPreviewSource : '');
  const hasExternalDescriptionUrl = isExternalDescription && isHttpsUrl(packageForm.descriptionUrl);
  const isExternalDescriptionLoaded = hasExternalDescriptionUrl && externalDescriptionStatus === 'success';

  const descriptionSourceUrl = useMemo(
    () => getDescriptionSourceUrl(packageForm, catalogBaseUrl),
    [packageForm.descriptionMode, packageForm.descriptionUrl, packageForm.descriptionPath, catalogBaseUrl],
  );

  useEffect(() => {
    if (descriptionTab !== 'preview') {
      setDescriptionPreviewHtml('');
      return;
    }
    const text = deferredDescriptionText;
    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      if (cancelled) return;
      setDescriptionPreviewHtml(renderMarkdown(text));
    };
    // 変換はアイドル時に遅延実行し、入力中の体感遅延を抑える。
    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(run, { timeout: 500 });
    } else {
      timeoutId = setTimeout(run, 200);
    }
    return () => {
      cancelled = true;
      if (idleId != null && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [descriptionTab, deferredDescriptionText]);

  useEffect(() => {
    if (!descriptionSourceUrl) {
      setDescriptionLoading(false);
      if (isExternalDescription) {
        setExternalDescriptionText('');
        setExternalDescriptionStatus('idle');
      }
      return;
    }
    let cancelled = false;
    const targetId = packageForm.id;
    if (isExternalDescription) {
      setExternalDescriptionText('');
      setExternalDescriptionStatus('loading');
    }
    setDescriptionLoading(true);
    (async () => {
      try {
        const res = await fetch(descriptionSourceUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        if (cancelled) return;
        if (isExternalDescription) {
          setExternalDescriptionText(text);
          setExternalDescriptionStatus('success');
          return;
        }
        // 非同期競合で別パッケージに上書きしないよう、id が一致する時だけ反映する。
        setPackageForm((prev) => (prev.id === targetId ? { ...prev, descriptionText: text } : prev));
      } catch {
        if (cancelled) return;
        if (isExternalDescription) {
          setExternalDescriptionText('');
          setExternalDescriptionStatus('error');
          return;
        }
        setPackageForm((prev) => (prev.id === targetId ? { ...prev, descriptionText: '' } : prev));
      } finally {
        if (!cancelled) setDescriptionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [descriptionSourceUrl, isExternalDescription, packageForm.id, setPackageForm]);

  return {
    descriptionLoading,
    descriptionPreviewHtml,
    externalDescriptionStatus,
    isExternalDescription,
    hasExternalDescriptionUrl,
    isExternalDescriptionLoaded,
  };
}
