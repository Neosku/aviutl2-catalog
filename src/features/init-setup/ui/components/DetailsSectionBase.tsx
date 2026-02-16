import React from 'react';
import { FolderOpen } from 'lucide-react';

interface DetailsSectionHeaderProps {
  title: string;
  description: string;
}

interface DetailsSectionInputProps {
  inputId: string;
  inputLabel: string;
  inputLabelClassName: string;
  inputValue: string;
  inputPlaceholder: string;
  pickButtonTitle: string;
  inputHint?: string;
  onInputChange: (value: string) => void;
  onPickDir: () => void;
}

interface DetailsSectionPortableProps {
  portable: boolean;
  standardLabel: string;
  portableActiveClassName: string;
  portableSectionClassName?: string;
  onPortableChange: (portable: boolean) => void;
}

interface DetailsSectionActionsProps {
  savingInstallDetails: boolean;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
  savingContent: React.ReactNode;
  idleContent: React.ReactNode;
}

interface DetailsSectionBaseProps {
  header: DetailsSectionHeaderProps;
  input: DetailsSectionInputProps;
  portable: DetailsSectionPortableProps;
  actions: DetailsSectionActionsProps;
}

const inactivePortableClassName =
  'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-800';
const standardActiveClassName = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500';

export default function DetailsSectionBase({ header, input, portable, actions }: DetailsSectionBaseProps) {
  const { title, description } = header;
  const {
    inputId,
    inputLabel,
    inputLabelClassName,
    inputValue,
    inputPlaceholder,
    pickButtonTitle,
    inputHint,
    onInputChange,
    onPickDir,
  } = input;
  const {
    portable: portableEnabled,
    standardLabel,
    portableActiveClassName,
    portableSectionClassName = 'space-y-3',
    onPortableChange,
  } = portable;
  const { savingInstallDetails, canProceed, onBack, onNext, savingContent, idleContent } = actions;

  return (
    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto w-full justify-center">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{description}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-8">
        <div className="space-y-2">
          <label className={inputLabelClassName} htmlFor={inputId}>
            {inputLabel}
          </label>
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <input
              type="text"
              id={inputId}
              className="flex-1 h-11 px-4 text-sm font-mono bg-transparent border-none focus:ring-0 placeholder-slate-400 text-slate-800 dark:text-slate-200"
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder={inputPlaceholder}
            />
            <button
              type="button"
              className="px-5 border-l border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
              onClick={onPickDir}
              title={pickButtonTitle}
            >
              <FolderOpen size={18} />
            </button>
          </div>
          {inputHint && <p className="text-[14px] text-slate-400 dark:text-slate-500 ml-1">{inputHint}</p>}
        </div>

        <div className={portableSectionClassName}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
            ポータブルモード設定
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onPortableChange(false)}
              className={`w-full text-left cursor-pointer rounded-xl border p-4 transition-all duration-200 ${!portableEnabled ? standardActiveClassName : inactivePortableClassName}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`font-bold text-sm ${!portableEnabled ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  {standardLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                プラグインやスクリプトを ProgramData に導入します
              </p>
            </button>

            <button
              type="button"
              onClick={() => onPortableChange(true)}
              className={`w-full text-left cursor-pointer rounded-xl border p-4 transition-all duration-200 ${portableEnabled ? portableActiveClassName : inactivePortableClassName}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`font-bold text-sm ${portableEnabled ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  ポータブル
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                プラグインやスクリプトを aviutl2.exe と同じ階層にある data フォルダに導入します
              </p>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          className="h-11 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
          onClick={onBack}
        >
          戻る
        </button>
        <button
          className="btn btn--primary h-11 px-8 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          onClick={onNext}
          disabled={savingInstallDetails || !canProceed}
        >
          {savingInstallDetails ? savingContent : idleContent}
        </button>
      </div>
    </div>
  );
}
