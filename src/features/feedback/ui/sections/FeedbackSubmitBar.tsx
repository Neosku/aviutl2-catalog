import Button from '@/components/ui/Button';
import { action } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';
import type { FeedbackSubmitBarProps } from '../types';

export default function FeedbackSubmitBar({ submitting }: FeedbackSubmitBarProps) {
  return (
    <div className="flex justify-end pt-4">
      <Button
        type="submit"
        variant="primary"
        size="default"
        className="cursor-pointer px-6 py-2.5 shadow-md hover:shadow-lg disabled:hover:shadow-md dark:focus-visible:ring-offset-slate-900"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <span className={cn(action.spinnerWhite, 'h-4 w-4 animate-spin rounded-full border-2')} />
            送信中...
          </>
        ) : (
          <>送信する</>
        )}
      </Button>
    </div>
  );
}
