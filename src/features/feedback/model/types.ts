export type FeedbackMode = 'bug' | 'inquiry';
export type SubmitAction = 'issues' | 'feedback';

export interface DeviceOsInfo {
  name?: string;
  version?: string;
  arch?: string;
}

export interface DeviceCpuInfo {
  model?: string;
  cores?: number;
  logicalProcessors?: number;
  maxClockMHz?: number;
}

export interface DeviceGpuInfo {
  name?: string;
  vendor?: string;
  driver?: string;
}

export interface DeviceInfo {
  os?: DeviceOsInfo;
  cpu?: DeviceCpuInfo;
  gpu?: DeviceGpuInfo;
}

export interface BugFormState {
  title: string;
  detail: string;
  contact: string;
  includeApp: boolean;
  includeDevice: boolean;
  includeLog: boolean;
}

export interface InquiryFormState {
  title: string;
  detail: string;
  contact: string;
}

export interface FeedbackSuccessDialogState {
  open: boolean;
  message: string;
  url: string;
}

export interface FeedbackDiagnosticsSnapshot {
  device: DeviceInfo | null;
  installedPackages: string[];
  appLog: string;
  appVersion: string;
}

export interface FeedbackDiagnosticsState extends FeedbackDiagnosticsSnapshot {
  loading: boolean;
}

interface FeedbackSubmitPayloadBase {
  title: string;
  body: string;
  labels: string[];
  contact?: string;
}

export interface BugSubmitPayload extends FeedbackSubmitPayloadBase {
  action: 'issues';
  appVersion?: string;
  os?: string;
  cpu?: string;
  gpu?: string;
  installed?: string[];
}

export interface InquirySubmitPayload extends FeedbackSubmitPayloadBase {
  action: 'feedback';
}

export interface SubmitEndpointResponse {
  error?: string;
  message?: string;
  detail?: string;
  pr_url?: string;
  public_issue_url?: string;
  url?: string;
}

export interface ParsedSubmitResponse {
  json: SubmitEndpointResponse | null;
  text: string;
}
