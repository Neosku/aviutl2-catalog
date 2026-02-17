import {
  BUG_SUCCESS_MESSAGE,
  INQUIRY_SUCCESS_MESSAGE,
  SUBMIT_ACTIONS,
  SUBMIT_ENDPOINT_HTTPS_ERROR,
  SUBMIT_ENDPOINT_REQUIRED_ERROR,
  SUBMIT_FAILED_ERROR,
} from './constants';
import type {
  BugFormState,
  FeedbackDiagnosticsSnapshot,
  FeedbackMode,
  BugSubmitPayload,
  InquiryFormState,
  InquirySubmitPayload,
  ParsedSubmitResponse,
} from './types';

type BugPayloadDiagnostics = Pick<FeedbackDiagnosticsSnapshot, 'device' | 'installedPackages' | 'appVersion'>;

function formatOs(device: BugPayloadDiagnostics['device']) {
  return `${device?.os?.name || ''} ${device?.os?.version || ''} (${device?.os?.arch || ''})`.trim();
}

function formatCpu(device: BugPayloadDiagnostics['device']) {
  return `${device?.cpu?.model || ''}${device?.cpu?.cores ? ` / Cores: ${device.cpu.cores}` : ''}${
    device?.cpu?.logicalProcessors ? ` / Logical: ${device.cpu.logicalProcessors}` : ''
  }${device?.cpu?.maxClockMHz ? ` / Max Clock: ${device.cpu.maxClockMHz} MHz` : ''}`.trim();
}

function formatGpu(device: BugPayloadDiagnostics['device']) {
  return `${device?.gpu?.name || device?.gpu?.vendor || ''} ${device?.gpu?.driver || ''}`.trim();
}

export function validateSubmitEndpoint(submitEndpoint: string) {
  if (!submitEndpoint) return SUBMIT_ENDPOINT_REQUIRED_ERROR;
  if (!/^https:\/\//i.test(submitEndpoint)) return SUBMIT_ENDPOINT_HTTPS_ERROR;
  return '';
}

export function buildBugPayload(bug: BugFormState, diagnostics: BugPayloadDiagnostics): BugSubmitPayload {
  const os = bug.includeDevice ? formatOs(diagnostics.device) : '';
  const cpu = bug.includeDevice ? formatCpu(diagnostics.device) : '';
  const gpu = bug.includeDevice ? formatGpu(diagnostics.device) : '';
  const installed =
    bug.includeApp && diagnostics.installedPackages.length > 0 ? diagnostics.installedPackages : undefined;
  return {
    action: SUBMIT_ACTIONS.bug,
    title: `不具合報告: ${bug.title.trim()}`,
    body: bug.detail.trim(),
    labels: ['bug', 'from-client'],
    contact: bug.contact.trim() || undefined,
    appVersion: bug.includeApp ? diagnostics.appVersion || undefined : undefined,
    os: os || undefined,
    cpu: cpu || undefined,
    gpu: gpu || undefined,
    installed,
  };
}

export function buildInquiryPayload(inquiry: InquiryFormState): InquirySubmitPayload {
  return {
    action: SUBMIT_ACTIONS.inquiry,
    title: `問い合わせ: ${inquiry.title.trim()}`,
    body: inquiry.detail.trim(),
    labels: ['inquiry', 'from-client'],
    contact: inquiry.contact.trim() || undefined,
  };
}

export function appendAttachments(formData: FormData, attachments: File[]) {
  attachments.forEach((file) => {
    formData.append('files[]', file, file.name || 'attachment');
  });
}

export function appendAppLog(formData: FormData, appLog: string, enabled: boolean) {
  if (!enabled || !appLog) return;
  const blob = new Blob([appLog], { type: 'text/plain' });
  formData.append('files[]', blob, 'app.log');
}

export function mergeAttachments(current: File[], selected: File[]) {
  const merged = Array.from(current);
  const existing = new Set(merged.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
  selected.forEach((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (existing.has(key)) return;
    merged.push(file);
    existing.add(key);
  });
  return merged;
}

export function toInstalledPackages(installedMap: unknown) {
  if (!installedMap || typeof installedMap !== 'object') return [];
  const entries = Object.entries(installedMap as Record<string, unknown>);
  return entries.slice(0, 300).map(([id, version]) => {
    const normalizedVersion = typeof version === 'string' ? version.trim() : String(version ?? '').trim();
    return normalizedVersion ? `${id} ${normalizedVersion}` : id;
  });
}

export async function parseSubmitResponse(response: Response): Promise<ParsedSubmitResponse> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await response.json().catch(() => null);
    return { json, text: '' };
  }
  if (response.status !== 204) {
    const text = await response.text().catch(() => '');
    return { json: null, text };
  }
  return { json: null, text: '' };
}

export function resolveSubmitErrorMessage(response: Response, parsed: ParsedSubmitResponse) {
  return parsed.json?.error || parsed.json?.message || parsed.json?.detail || parsed.text || `HTTP ${response.status}`;
}

export function resolveSubmitSuccessMessage(mode: FeedbackMode, parsed: ParsedSubmitResponse) {
  const fallback = mode === 'bug' ? BUG_SUCCESS_MESSAGE : INQUIRY_SUCCESS_MESSAGE;
  return parsed.json?.message || parsed.text || fallback;
}

export function resolveSubmitSuccessUrl(parsed: ParsedSubmitResponse) {
  return parsed.json?.pr_url || parsed.json?.public_issue_url || parsed.json?.url || '';
}

export function toErrorMessage(error: unknown, fallback = SUBMIT_FAILED_ERROR) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
