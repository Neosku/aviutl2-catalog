import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import ProgressCircle from '../../../../components/ProgressCircle.jsx';
import DetailsSectionBase from '../components/DetailsSectionBase';
import type { InstallDetailsSectionProps } from '../types';

export default function InstallDetailsSection({
  installDir,
  portable,
  savingInstallDetails,
  canProceed,
  coreProgressRatio,
  onInstallDirChange,
  onPortableChange,
  onPickInstallDir,
  onBack,
  onNext,
}: InstallDetailsSectionProps) {
  const header = useMemo(
    () => ({
      title: 'インストール先の指定',
      description: 'AviUtl2 をインストールするフォルダを指定してください',
    }),
    [],
  );
  const input = useMemo(
    () => ({
      inputId: 'setup-install-dir',
      inputLabel: 'インストール先フォルダ',
      inputLabelClassName: 'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1',
      inputValue: installDir,
      inputPlaceholder: 'C:\\path\\to\\install',
      pickButtonTitle: '参照',
      onInputChange: onInstallDirChange,
      onPickDir: onPickInstallDir,
    }),
    [installDir, onInstallDirChange, onPickInstallDir],
  );
  const portableOptions = useMemo(
    () => ({
      portable,
      standardLabel: '標準 （推奨）',
      portableActiveClassName: 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 ring-1 ring-blue-500',
      portableSectionClassName: 'space-y-3 pt-2',
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
          <ProgressCircle
            value={coreProgressRatio}
            size={16}
            strokeWidth={4}
            ariaLabel="インストール進捗"
            className="text-white"
          />
          インストール中…
        </span>
      ),
      idleContent: (
        <span className="flex items-center gap-2">
          <Download size={18} />
          インストールして次へ
        </span>
      ),
    }),
    [canProceed, coreProgressRatio, onBack, onNext, savingInstallDetails],
  );

  return <DetailsSectionBase header={header} input={input} portable={portableOptions} actions={actions} />;
}
