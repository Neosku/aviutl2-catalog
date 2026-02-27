import React from 'react';
import Button from '@/components/ui/Button';
import { FolderOpen } from 'lucide-react';
import { action, layout, state, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

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

interface PortableOptionCardProps {
  active: boolean;
  label: string;
  description: string;
  activeClassName: string;
  onClick: () => void;
}

const inactivePortableClassName =
  'border-slate-200 hover:border-slate-300 bg-white dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-800';
const standardActiveClassName = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500';

function PortableOptionCard({ active, label, description, activeClassName, onClick }: PortableOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left cursor-pointer rounded-xl border p-4 transition-all duration-200',
        active ? activeClassName : inactivePortableClassName,
      )}
    >
      <div className={cn(layout.inlineGap2, 'mb-2')}>
        <span
          className={cn(
            'font-bold text-sm',
            active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300',
          )}
        >
          {label}
        </span>
      </div>
      <p className={text.mutedXsRelaxed}>{description}</p>
    </button>
  );
}

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
    <div className={cn(layout.centerCol, state.enterSlideRight500, 'flex-1 max-w-2xl mx-auto w-full')}>
      <div className="text-center mb-8">
        <h2 className={text.title2xl}>{title}</h2>
        <p className={text.mutedSmMt2}>{description}</p>
      </div>

      <div className={cn(surface.card, 'p-6 space-y-8')}>
        <div className="space-y-2">
          <label className={inputLabelClassName} htmlFor={inputId}>
            {inputLabel}
          </label>
          <div
            className={cn(
              surface.baseMuted,
              'flex rounded-xl bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all',
            )}
          >
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
            <PortableOptionCard
              active={!portableEnabled}
              label={standardLabel}
              description="プラグインやスクリプトを ProgramData に導入します"
              activeClassName={standardActiveClassName}
              onClick={() => onPortableChange(false)}
            />

            <PortableOptionCard
              active={portableEnabled}
              label="ポータブル"
              description="プラグインやスクリプトを aviutl2.exe と同じ階層にある data フォルダに導入します"
              activeClassName={portableActiveClassName}
              onClick={() => onPortableChange(true)}
            />
          </div>
        </div>
      </div>

      <div className={cn(layout.rowBetween, 'mt-8')}>
        <Button variant="secondary" size="none" radius="xl" className={action.initSecondary} onClick={onBack}>
          戻る
        </Button>
        <Button
          variant="primary"
          size="none"
          radius="xl"
          className={action.initPrimary}
          onClick={onNext}
          disabled={savingInstallDetails || !canProceed}
        >
          {savingInstallDetails ? savingContent : idleContent}
        </Button>
      </div>
    </div>
  );
}
