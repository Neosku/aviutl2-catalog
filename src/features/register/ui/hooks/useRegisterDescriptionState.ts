/**
 * 詳細説明入力の状態とプレビュー生成を扱う hook
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { getDescriptionSourceUrl, isHttpsUrl } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import type { RegisterMarkdownTab } from '../types';
import useMarkdownPreview from './useMarkdownPreview';

interface UseRegisterDescriptionStateArgs {
  packageForm: RegisterPackageForm;
  catalogBaseUrl: string;
  descriptionTab: RegisterMarkdownTab;
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
}

export default function useRegisterDescriptionState({
  packageForm,
  catalogBaseUrl,
  descriptionTab,
  setPackageForm,
}: UseRegisterDescriptionStateArgs) {
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [externalDescriptionText, setExternalDescriptionText] = useState('');
  const [externalDescriptionStatus, setExternalDescriptionStatus] = useState('idle');
  const latestDescriptionTextRef = useRef(packageForm.descriptionText);

  const isExternalDescription = packageForm.descriptionMode === 'external';
  const descriptionPreviewSource = isExternalDescription ? externalDescriptionText : packageForm.descriptionText;
  const descriptionPreviewHtml = useMarkdownPreview(descriptionPreviewSource, descriptionTab);
  const hasExternalDescriptionUrl = isExternalDescription && isHttpsUrl(packageForm.descriptionUrl);
  const isExternalDescriptionLoaded = hasExternalDescriptionUrl && externalDescriptionStatus === 'success';

  const descriptionSourceUrl = useMemo(
    () => getDescriptionSourceUrl(packageForm, catalogBaseUrl),
    [packageForm.descriptionMode, packageForm.descriptionUrl, packageForm.descriptionPath, catalogBaseUrl],
  );

  useEffect(() => {
    latestDescriptionTextRef.current = packageForm.descriptionText;
  }, [packageForm.descriptionText]);

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
    const initialDescriptionText = latestDescriptionTextRef.current;
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
        setPackageForm((prev) =>
          prev.id === targetId && prev.descriptionText === initialDescriptionText
            ? { ...prev, descriptionText: text }
            : prev,
        );
      } catch {
        if (cancelled) return;
        if (isExternalDescription) {
          setExternalDescriptionText('');
          setExternalDescriptionStatus('error');
          return;
        }
        setPackageForm((prev) =>
          prev.id === targetId && prev.descriptionText === initialDescriptionText
            ? { ...prev, descriptionText: '' }
            : prev,
        );
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
