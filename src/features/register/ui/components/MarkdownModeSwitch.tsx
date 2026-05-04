import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import { action } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

interface MarkdownModeSwitchProps {
  isExternal: boolean;
  onInline: () => void;
  onExternal: () => void;
  inlineLabel?: string;
  externalLabel?: string;
}

export default function MarkdownModeSwitch({
  isExternal,
  onInline,
  onExternal,
  inlineLabel,
  externalLabel,
}: MarkdownModeSwitchProps) {
  const { t } = useTranslation('register');
  return (
    <div className={action.segmentedGroupFlush}>
      <Button
        variant="plain"
        size="none"
        type="button"
        className={cn(
          action.segmentedOptionBase,
          'rounded-l-lg rounded-r-none px-3 py-1.5',
          !isExternal ? action.switchTabActive : action.switchTabInactive,
        )}
        onClick={onInline}
      >
        {inlineLabel ?? t('markdownControls.modeInline')}
      </Button>
      <Button
        variant="plain"
        size="none"
        type="button"
        className={cn(
          action.segmentedOptionBase,
          'rounded-l-none rounded-r-lg px-3 py-1.5',
          isExternal ? action.switchTabActive : action.switchTabInactive,
        )}
        onClick={onExternal}
      >
        {externalLabel ?? t('markdownControls.modeExternal')}
      </Button>
    </div>
  );
}
