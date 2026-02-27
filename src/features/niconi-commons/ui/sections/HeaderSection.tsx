import { Check, Copy } from 'lucide-react';
import type { HeaderSectionProps } from '../types';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { layout, page, text } from '@/components/ui/_styles';

export default function HeaderSection({ copyState, selectedCount, onCopySelected }: HeaderSectionProps) {
  return (
    <div className={page.headerRow}>
      <div>
        <h2 className={cn(text.titleXl, 'mb-1')}>ニコニ・コモンズID</h2>
        <p className={text.mutedSm}>インストール済みでニコニ・コモンズIDが登録されているパッケージの一覧を表示します</p>
      </div>
      <div className={layout.wrapGap2}>
        <Button
          variant={copyState.ok ? 'success' : 'primary'}
          size="default"
          className={cn('cursor-pointer', copyState.ok && 'bg-emerald-600 hover:bg-emerald-700')}
          onClick={onCopySelected}
          disabled={selectedCount === 0}
          type="button"
        >
          {copyState.ok ? <Check size={16} /> : <Copy size={16} />}
          {copyState.ok ? `${copyState.count}件コピーしました` : 'ニコニ・コモンズIDをコピー'}
        </Button>
      </div>
    </div>
  );
}
