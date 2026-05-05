/**
 * Segmented button selector shared by register sections.
 */
import Button from '@/components/ui/Button';
import { action } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export interface SegmentedOption {
  value: string;
  label: string;
}

interface SegmentedOptionGroupProps {
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export default function SegmentedOptionGroup({ value, options, onChange, ariaLabel }: SegmentedOptionGroupProps) {
  return (
    <div className={cn(action.segmentedGroup, 'flex flex-wrap gap-1')} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <Button
            variant="plain"
            size="xs"
            key={option.value}
            type="button"
            className={cn(
              action.segmentedOptionBase,
              'flex-1',
              isActive ? action.segmentedOptionActive : action.segmentedOptionInactive,
            )}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
