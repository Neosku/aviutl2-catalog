import React, { useMemo } from 'react';
import DetailsSectionBase from '../components/DetailsSectionBase';
import type { ExistingDetailsSectionProps } from '../types';

export default function ExistingDetailsSection({
  aviutlRoot,
  portable,
  savingInstallDetails,
  canProceed,
  onAviutlRootChange,
  onPortableChange,
  onPickExistingDir,
  onBack,
  onNext,
}: ExistingDetailsSectionProps) {
  const header = useMemo(
    () => ({
      title: 'フォルダの指定',
      description: 'インストール済みの AviUtl2 フォルダを選択してください',
    }),
    [],
  );
  const input = useMemo(
    () => ({
      inputId: 'setup-aviutl2-root',
      inputLabel: 'AviUtl2 フォルダパス',
      inputLabelClassName: 'text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 ml-1',
      inputValue: aviutlRoot,
      inputPlaceholder: 'C:\\path\\to\\aviutl',
      pickButtonTitle: '参照',
      inputHint: 'aviutl2.exe が含まれているフォルダを選択してください',
      onInputChange: onAviutlRootChange,
      onPickDir: onPickExistingDir,
    }),
    [aviutlRoot, onAviutlRootChange, onPickExistingDir],
  );
  const portableOptions = useMemo(
    () => ({
      portable,
      standardLabel: '標準（推奨）',
      portableActiveClassName: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500',
      onPortableChange,
    }),
    [onPortableChange, portable],
  );
  const actions = useMemo(
    () => ({
      savingInstallDetails,
      canProceed,
      onBack,
      onNext,
      savingContent: (
        <span className="flex items-center gap-2">
          <div className="spinner border-white/30 border-t-white" /> 処理中…
        </span>
      ),
      idleContent: '次へ',
    }),
    [canProceed, onBack, onNext, savingInstallDetails],
  );

  return <DetailsSectionBase header={header} input={input} portable={portableOptions} actions={actions} />;
}
