import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import type { FeedbackErrorSectionProps } from '../types';

export default function FeedbackErrorSection({ message }: FeedbackErrorSectionProps) {
  if (!message) return null;
  return (
    <Alert variant="danger" className="flex items-start gap-2 rounded-xl select-text">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span className="whitespace-pre-wrap">{message}</span>
    </Alert>
  );
}
