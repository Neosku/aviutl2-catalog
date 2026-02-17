import type { BugFormState, FeedbackMode, FeedbackSuccessDialogState, InquiryFormState, SubmitAction } from './types';

export const FEEDBACK_INITIAL_MODE: FeedbackMode = 'bug';

export const SUBMIT_ACTIONS = {
  bug: 'issues',
  inquiry: 'feedback',
} as const satisfies Record<FeedbackMode, SubmitAction>;

export const DEFAULT_BUG_FORM: BugFormState = {
  title: '',
  detail: '',
  contact: '',
  includeApp: true,
  includeDevice: true,
  includeLog: true,
};

export const DEFAULT_INQUIRY_FORM: InquiryFormState = {
  title: '',
  detail: '',
  contact: '',
};

export const EMPTY_SUCCESS_DIALOG: FeedbackSuccessDialogState = {
  open: false,
  message: '',
  url: '',
};

export const BUG_SUCCESS_MESSAGE = '不具合報告を送信しました。ご協力ありがとうございます。';
export const INQUIRY_SUCCESS_MESSAGE = '意見/問い合わせを送信しました。ありがとうございます。';

export const REQUIRED_FIELDS_ERROR = 'タイトルと詳細は必須です';
export const SUBMIT_ENDPOINT_REQUIRED_ERROR = 'VITE_SUBMIT_ENDPOINT が設定されていません。';
export const SUBMIT_ENDPOINT_HTTPS_ERROR = 'VITE_SUBMIT_ENDPOINT には https:// で始まるURLを設定してください。';
export const SUBMIT_FAILED_ERROR = '送信に失敗しました。ネットワークや設定をご確認ください。';
