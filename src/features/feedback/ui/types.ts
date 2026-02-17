import type { ChangeEventHandler, MouseEventHandler } from 'react';
import type {
  BugFormState,
  DeviceInfo,
  FeedbackMode,
  FeedbackSuccessDialogState,
  InquiryFormState,
} from '../model/types';

export type FeedbackFieldChangeHandler = ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
export type FeedbackFileChangeHandler = ChangeEventHandler<HTMLInputElement>;

export interface FeedbackDeleteButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
  title?: string;
}

export interface FeedbackToggleSwitchProps {
  id?: string;
  name: string;
  checked: boolean;
  onChange: FeedbackFieldChangeHandler;
}

export interface FeedbackVisibilityBadgeProps {
  type?: 'public' | 'private';
  label?: string;
}

export interface FeedbackSuccessDialogProps {
  dialog: FeedbackSuccessDialogState;
  primaryText: string;
  onClose: () => void;
}

export interface FeedbackModeTabsProps {
  mode: FeedbackMode;
  onModeChange: (mode: FeedbackMode) => void;
}

export interface FeedbackErrorSectionProps {
  message: string;
}

export interface FeedbackAttachmentSectionProps {
  attachments: File[];
  onFilesChange: FeedbackFileChangeHandler;
  onRemoveAttachment: (index: number) => void;
  label?: string;
  optionalLabel?: string;
}

export interface FeedbackEnvironmentSectionProps {
  bug: BugFormState;
  loading: boolean;
  appVersion: string;
  pluginsCount: number;
  device: DeviceInfo | null;
  onBugChange: FeedbackFieldChangeHandler;
}

export interface FeedbackLogSectionProps {
  loading: boolean;
  includeLog: boolean;
  appLog: string;
  onBugChange: FeedbackFieldChangeHandler;
}

export interface BugReportFormSectionProps {
  bug: BugFormState;
  loadingDiag: boolean;
  appVersion: string;
  pluginsCount: number;
  device: DeviceInfo | null;
  appLog: string;
  attachments: File[];
  onBugChange: FeedbackFieldChangeHandler;
  onFilesChange: FeedbackFileChangeHandler;
  onRemoveAttachment: (index: number) => void;
}

export interface InquiryFormSectionProps {
  inquiry: InquiryFormState;
  attachments: File[];
  onInquiryChange: FeedbackFieldChangeHandler;
  onFilesChange: FeedbackFileChangeHandler;
  onRemoveAttachment: (index: number) => void;
}

export interface FeedbackSubmitBarProps {
  submitting: boolean;
}
