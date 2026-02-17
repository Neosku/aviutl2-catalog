import { useCallback, useState } from 'react';
import { mergeAttachments } from '../../model/helpers';
import type { FeedbackFileChangeHandler } from '../types';

export default function useFeedbackAttachments() {
  const [attachments, setAttachments] = useState<File[]>([]);

  const onFilesChange: FeedbackFileChangeHandler = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setAttachments((prev) => mergeAttachments(prev, selectedFiles));
    try {
      event.target.value = '';
    } catch {
      // ignore
    }
  }, []);

  const onRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  return {
    attachments,
    onFilesChange,
    onRemoveAttachment,
  };
}
