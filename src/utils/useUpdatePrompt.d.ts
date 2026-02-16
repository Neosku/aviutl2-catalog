export interface UseUpdatePromptOptions {
  autoCheck?: boolean;
}

export interface UpdatePromptInstallable {
  downloadAndInstall: () => Promise<void>;
}

export interface UpdatePromptInfo {
  update?: UpdatePromptInstallable | null;
  version?: string;
  notes?: string;
  publishedOn?: string;
  rawPubDate?: string;
}

export interface UseUpdatePromptResult {
  updateInfo: UpdatePromptInfo | null;
  updateBusy: boolean;
  updateError: string;
  dismissUpdate: () => void;
  confirmUpdate: () => Promise<void>;
}

export function useUpdatePrompt(options?: UseUpdatePromptOptions): UseUpdatePromptResult;
