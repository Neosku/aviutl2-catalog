import { useCallback, useState } from 'react';
import { DEFAULT_BUG_FORM, DEFAULT_INQUIRY_FORM } from '../../model/constants';
import { BUG_BOOLEAN_FIELD_NAMES, BUG_TEXT_FIELD_NAMES, INQUIRY_FIELD_NAMES } from '../../model/fieldNames';
import type { BugFormState, InquiryFormState } from '../../model/types';
import type { FeedbackFieldChangeHandler } from '../types';

const BUG_TEXT_FIELDS = new Set<string>(BUG_TEXT_FIELD_NAMES);
const BUG_BOOLEAN_FIELDS = new Set<string>(BUG_BOOLEAN_FIELD_NAMES);
const INQUIRY_FIELDS = new Set<string>(INQUIRY_FIELD_NAMES);

export default function useFeedbackForms() {
  const [bug, setBug] = useState<BugFormState>(DEFAULT_BUG_FORM);
  const [inquiry, setInquiry] = useState<InquiryFormState>(DEFAULT_INQUIRY_FORM);

  const onBugChange: FeedbackFieldChangeHandler = useCallback((event) => {
    const { name, type, value } = event.target;
    const checked = 'checked' in event.target ? event.target.checked : false;
    setBug((prev) => {
      if (BUG_TEXT_FIELDS.has(name)) return { ...prev, [name]: value };
      if (BUG_BOOLEAN_FIELDS.has(name)) return { ...prev, [name]: Boolean(type === 'checkbox' ? checked : value) };
      return prev;
    });
  }, []);

  const onInquiryChange: FeedbackFieldChangeHandler = useCallback((event) => {
    const { name, value } = event.target;
    setInquiry((prev) => {
      if (INQUIRY_FIELDS.has(name)) return { ...prev, [name]: value };
      return prev;
    });
  }, []);

  return {
    bug,
    inquiry,
    onBugChange,
    onInquiryChange,
  };
}
