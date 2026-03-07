import { buttonVariants } from '@/components/ui/Button';
import { ExternalLink } from 'lucide-react';
import { text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function FeedbackHeaderSection() {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">フィードバック</h2>
        <p className={text.mutedSm}>不具合のご報告やご意見をお寄せください</p>
      </div>
      <a
        href="https://github.com/Neosku/aviutl2-catalog/issues"
        target="_blank"
        rel="noreferrer noopener"
        className={cn(buttonVariants({ variant: 'secondary', size: 'actionSm' }), 'cursor-pointer')}
      >
        <ExternalLink size={16} />
        報告済みの不具合
      </a>
    </div>
  );
}
