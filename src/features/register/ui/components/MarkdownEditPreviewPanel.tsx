import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import * as tauriShell from '@tauri-apps/plugin-shell';
import { action, surface } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';
import type { RegisterMarkdownTab } from '../types';

interface MarkdownEditPreviewPanelProps {
  tab: RegisterMarkdownTab;
  onTabChange: (tab: RegisterMarkdownTab) => void;
  previewHtml: string;
  editContent: ReactNode;
  isExternal?: boolean;
  editLabel?: string;
  externalEditLabel?: string;
  previewMaxHeightClassName?: string;
}

export default function MarkdownEditPreviewPanel({
  tab,
  onTabChange,
  previewHtml,
  editContent,
  isExternal = false,
  editLabel,
  externalEditLabel,
  previewMaxHeightClassName = 'max-h-[400px]',
}: MarkdownEditPreviewPanelProps) {
  const { t } = useTranslation(['register', 'common']);
  const previewMarkup = useMemo(() => ({ __html: previewHtml }), [previewHtml]);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || tab !== 'preview') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || !link.href) return;
      event.preventDefault();
      void tauriShell.open(link.href);
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [tab]);

  return (
    <div className={surface.panelOverflow}>
      <div
        className="flex border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
        role="tablist"
      >
        <Button
          variant="plain"
          size="actionSm"
          type="button"
          role="tab"
          aria-selected={tab === 'edit'}
          className={cn(
            action.segmentedOptionBase,
            'flex-1 rounded-b-none rounded-tl-lg rounded-tr-none',
            tab === 'edit' ? action.switchTabActive : action.switchTabInactive,
          )}
          onClick={() => onTabChange('edit')}
        >
          {isExternal
            ? (externalEditLabel ?? t('description.tabExternalEdit'))
            : (editLabel ?? t('description.tabEdit'))}
        </Button>
        <Button
          variant="plain"
          size="actionSm"
          type="button"
          role="tab"
          aria-selected={tab === 'preview'}
          className={cn(
            action.segmentedOptionBase,
            'flex-1 rounded-b-none rounded-tl-none rounded-tr-lg',
            tab === 'preview' ? action.switchTabActive : action.switchTabInactive,
          )}
          onClick={() => onTabChange('preview')}
        >
          {t('common:actions.preview')}
        </Button>
      </div>
      <div className="p-0">
        {tab === 'edit' ? (
          editContent
        ) : (
          <div
            ref={previewRef}
            className={cn(
              'prose prose-slate w-full max-w-none overflow-y-auto p-6 dark:prose-invert',
              previewMaxHeightClassName,
            )}
            dangerouslySetInnerHTML={previewMarkup}
          />
        )}
      </div>
    </div>
  );
}
