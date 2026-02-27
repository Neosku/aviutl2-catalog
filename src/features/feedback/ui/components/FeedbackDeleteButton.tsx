import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { FeedbackDeleteButtonProps } from '../types';

const FeedbackDeleteButton = memo(function FeedbackDeleteButton({
  onClick,
  ariaLabel = '削除',
  title,
}: FeedbackDeleteButtonProps) {
  return (
    <Button
      variant="iconSubtle"
      size="icon"
      className="cursor-pointer"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      onClick={onClick}
    >
      <Trash2 size={16} />
    </Button>
  );
});

export default FeedbackDeleteButton;
