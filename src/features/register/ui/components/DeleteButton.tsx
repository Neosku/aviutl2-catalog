/**
 * 削除ボタンコンポーネント
 */
import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { DeleteButtonProps } from '../types';
const DeleteButton = memo(function DeleteButton({ onClick, ariaLabel = '削除', title }: DeleteButtonProps) {
  return (
    <Button variant="iconDanger" size="icon" aria-label={ariaLabel} title={title || ariaLabel} onClick={onClick}>
      <Trash2 size={18} />
    </Button>
  );
});

export default DeleteButton;
