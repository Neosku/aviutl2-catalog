/**
 * 送信バーコンポーネント
 */
import Button, { buttonVariants } from '@/components/ui/Button';
import { BookOpen, FileBraces, Send } from 'lucide-react';
import type { RegisterSubmitBarProps } from '../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const utilityLinkButtonClass = buttonVariants({ variant: 'secondary', size: 'actionSm' });

export default function RegisterSubmitBar({
  packageGuideUrl,
  packageSender,
  submitting,
  pendingSubmitCount,
  blockedSubmitCount,
  submittingLabel,
  onPackageSenderChange,
  onOpenJsonImport,
}: RegisterSubmitBarProps) {
  const hasBlockedDrafts = blockedSubmitCount > 0;
  const canSubmit = pendingSubmitCount > 0 && !hasBlockedDrafts;
  const submitButtonLabel = submitting
    ? submittingLabel || '送信中…'
    : hasBlockedDrafts
      ? `テスト未完了 (${blockedSubmitCount}件)`
      : pendingSubmitCount <= 1
        ? '送信する'
        : `${pendingSubmitCount}件まとめて送信`;

  return (
    <section
      className={cn(
        surface.card,
        'sticky bottom-6 z-20 mb-6 p-4 shadow-xl backdrop-blur-md bg-white/90 dark:bg-slate-900/90',
      )}
    >
      <div className={layout.rowBetweenWrapGap4}>
        <div className={layout.inlineGap2}>
          {packageGuideUrl && (
            <a className={utilityLinkButtonClass} href={packageGuideUrl} target="_blank" rel="noreferrer noopener">
              <BookOpen size={16} />
              説明サイト
            </a>
          )}
          <Button variant="secondary" size="actionSm" type="button" onClick={onOpenJsonImport}>
            <FileBraces size={16} />
            JSON入力
          </Button>
        </div>
        <div className={layout.inlineGap3}>
          <div className="hidden sm:flex items-center gap-3">
            <span className={cn(layout.dividerRightMuted, text.mutedXs, 'text-[11px]')}>
              作者の方はできる限りご入力ください
            </span>
            <input
              type="text"
              value={packageSender}
              onChange={(e) => onPackageSenderChange(e.target.value)}
              placeholder="送信者のニックネーム"
              className="min-w-[240px]"
              aria-label="送信者のニックネーム"
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            type="submit"
            className="shadow-md hover:shadow-lg"
            disabled={submitting || !canSubmit}
          >
            {submitting ? (
              <>
                <span className="spinner" />
                {submitButtonLabel}
              </>
            ) : (
              <>
                <Send size={18} />
                {submitButtonLabel}
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
