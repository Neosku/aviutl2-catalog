import type { ReactNode } from 'react';
import Switch from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { layout, text } from '@/components/ui/_styles';

interface SettingToggleRowProps {
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onToggle: () => void;
  thumbContent?: ReactNode;
}

export default function SettingToggleRow({
  title,
  description,
  checked,
  onToggle,
  thumbContent,
}: SettingToggleRowProps) {
  const thumbClassName = thumbContent ? 'flex items-center justify-center' : 'inline-block';

  return (
    <div className="space-y-2">
      <div className={cn(layout.rowBetween, 'gap-4')}>
        <div className="flex-1">
          <div className="text-sm font-medium">{title}</div>
          {description ? <div className={text.mutedXs}>{description}</div> : null}
        </div>
        <Switch
          checked={checked}
          onCheckedChange={onToggle}
          className="shrink-0 cursor-pointer"
          thumbClassName={thumbClassName}
        >
          {thumbContent}
        </Switch>
      </div>
    </div>
  );
}
