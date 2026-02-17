import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { EMPTY_SUCCESS_DIALOG, REQUIRED_FIELDS_ERROR } from '../../model/constants';
import {
  appendAppLog,
  appendAttachments,
  buildBugPayload,
  buildInquiryPayload,
  parseSubmitResponse,
  resolveSubmitErrorMessage,
  resolveSubmitSuccessMessage,
  resolveSubmitSuccessUrl,
  toErrorMessage,
  validateSubmitEndpoint,
} from '../../model/helpers';
import type {
  BugFormState,
  DeviceInfo,
  FeedbackMode,
  FeedbackSuccessDialogState,
  InquiryFormState,
} from '../../model/types';

interface UseFeedbackSubmitParams {
  mode: FeedbackMode;
  submitEndpoint: string;
  bug: BugFormState;
  inquiry: InquiryFormState;
  attachments: File[];
  device: DeviceInfo | null;
  installedPackages: string[];
  appLog: string;
  appVersion: string;
}

export default function useFeedbackSubmit({
  mode,
  submitEndpoint,
  bug,
  inquiry,
  attachments,
  device,
  installedPackages,
  appLog,
  appVersion,
}: UseFeedbackSubmitParams) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successDialog, setSuccessDialog] = useState<FeedbackSuccessDialogState>(EMPTY_SUCCESS_DIALOG);

  const closeSuccessDialog = useCallback(() => {
    setSuccessDialog(EMPTY_SUCCESS_DIALOG);
  }, []);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError('');

      const endpointError = validateSubmitEndpoint(submitEndpoint);
      if (endpointError) {
        setError(endpointError);
        return;
      }

      const title = mode === 'bug' ? bug.title : inquiry.title;
      const detail = mode === 'bug' ? bug.detail : inquiry.detail;
      if (!title.trim() || !detail.trim()) {
        setError(REQUIRED_FIELDS_ERROR);
        return;
      }

      const formData = new FormData();
      if (mode === 'bug') {
        const payload = buildBugPayload(bug, { device, installedPackages, appVersion });
        formData.append('payload', JSON.stringify(payload));
        appendAppLog(formData, appLog, bug.includeLog);
      } else {
        const payload = buildInquiryPayload(inquiry);
        formData.append('payload', JSON.stringify(payload));
      }
      appendAttachments(formData, attachments);

      try {
        setSubmitting(true);
        const response = await fetch(submitEndpoint, { method: 'POST', body: formData });
        const parsed = await parseSubmitResponse(response);
        if (!response.ok) {
          throw new Error(resolveSubmitErrorMessage(response, parsed));
        }

        setSuccessDialog({
          open: true,
          message: resolveSubmitSuccessMessage(mode, parsed),
          url: resolveSubmitSuccessUrl(parsed),
        });
      } catch (submitError) {
        console.error(submitError);
        setError(toErrorMessage(submitError));
      } finally {
        setSubmitting(false);
      }
    },
    [appLog, appVersion, attachments, bug, device, inquiry, installedPackages, mode, submitEndpoint],
  );

  return {
    submitting,
    error,
    successDialog,
    closeSuccessDialog,
    onSubmit,
  };
}
