import * as z from 'zod';
import { formatUnknownError } from './errors.js';
import { logError } from './logging.js';

const SETTINGS_FILE = 'settings.json';
const settingsFileSchema = z.object({
  theme: z.string().optional(),
  aviutl2_root: z.string().optional(),
  is_portable_mode: z.boolean().optional(),
  package_state_opt_out: z.boolean().optional(),
});

export type AppSettings = z.infer<typeof settingsFileSchema>;

export async function getSettings(): Promise<AppSettings> {
  const fs = await import('@tauri-apps/plugin-fs');
  try {
    const exists = await fs.exists(SETTINGS_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return {};
    const raw = await fs.readTextFile(SETTINGS_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    const data = JSON.parse(raw || '{}');
    const parsed = settingsFileSchema.safeParse(data);
    if (parsed.success) {
      return parsed.data;
    }
    try {
      await logError('[getSettings] invalid settings.json shape');
    } catch {}
    return {};
  } catch (e: unknown) {
    try {
      await logError(`[getSettings] failed: ${formatUnknownError(e)}`);
    } catch {}
    return {};
  }
}
