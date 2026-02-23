import { formatUnknownError } from './errors';
import { logError } from './logging';

type JsonObject = Record<string, unknown>;

export interface DeviceOsInfo {
  name: string;
  version: string;
  arch: string;
}

export interface DeviceCpuInfo {
  model: string;
  manufacturer: string;
  maxClockMHz?: number;
  cores?: number;
  logicalProcessors?: number;
  id: string;
}

export interface DeviceGpuInfo {
  name: string;
  vendor: string;
  driver: string;
  driverDate: string;
  processor: string;
}

export interface DeviceInfo {
  os: DeviceOsInfo;
  cpu: DeviceCpuInfo;
  gpu: DeviceGpuInfo;
}

const LOG_FILE = 'logs/app.log';
const POWERSHELL_BASE_ARGS = ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command'];
const OS_INFO_QUERY =
  "(Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object -First 1 @{N='Platform';E={'Windows'}}, @{N='Version';E={$_.Version}}, @{N='Arch';E={$env:PROCESSOR_ARCHITECTURE}}) | ConvertTo-Json -Compress";
const CPU_INFO_QUERY =
  '(Get-CimInstance Win32_Processor | Select-Object -First 1 Name, Manufacturer, MaxClockSpeed, NumberOfCores, NumberOfLogicalProcessors, ProcessorId) | ConvertTo-Json -Compress';
const GPU_INFO_QUERY =
  "$ErrorActionPreference='SilentlyContinue'; $g=Get-CimInstance Win32_VideoController | Select-Object Name, AdapterCompatibility, DriverVersion, DriverDate, VideoProcessor, AdapterRAM | Sort-Object AdapterRAM -Descending | ConvertTo-Json -Compress; $g";

function toObject(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : null;
}

function parseJsonObject(raw: string): JsonObject | null {
  try {
    return toObject(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseJsonObjectList(raw: string): JsonObject[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => toObject(entry)).filter((entry): entry is JsonObject => Boolean(entry));
    }
    const row = toObject(parsed);
    return row ? [row] : [];
  } catch {
    return [];
  }
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function defaultDeviceInfo(): DeviceInfo {
  return {
    os: { name: 'Windows', version: '', arch: '' },
    cpu: { model: '', manufacturer: '', id: '' },
    gpu: { name: '', vendor: '', driver: '', driverDate: '', processor: '' },
  };
}

async function executePowerShell(command: string): Promise<string> {
  const shell = await import('@tauri-apps/plugin-shell');
  const ps = shell.Command.create('powershell', [...POWERSHELL_BASE_ARGS, command]);
  const out = await ps.execute();
  if (out.code !== 0) {
    throw new Error(`PowerShell exited with code ${out.code}`);
  }
  return String(out.stdout || '');
}

export async function collectDeviceInfo(): Promise<DeviceInfo> {
  const info = defaultDeviceInfo();

  try {
    const stdout = await executePowerShell(OS_INFO_QUERY);
    const os = parseJsonObject(stdout);
    if (os) {
      info.os = {
        name: toText(os.Platform) || 'Windows',
        version: toText(os.Version),
        arch: toText(os.Arch),
      };
    }
  } catch (e: unknown) {
    try {
      await logError(`[collectDeviceInfo] OS query failed: ${formatUnknownError(e)}`);
    } catch {}
  }

  try {
    const stdout = await executePowerShell(CPU_INFO_QUERY);
    const cpu = parseJsonObject(stdout);
    if (cpu) {
      info.cpu = {
        model: toText(cpu.Name),
        manufacturer: toText(cpu.Manufacturer),
        maxClockMHz: toOptionalNumber(cpu.MaxClockSpeed),
        cores: toOptionalNumber(cpu.NumberOfCores),
        logicalProcessors: toOptionalNumber(cpu.NumberOfLogicalProcessors),
        id: toText(cpu.ProcessorId),
      };
    }
  } catch (e: unknown) {
    try {
      await logError(`[collectDeviceInfo] CPU query failed: ${formatUnknownError(e)}`);
    } catch {}
  }

  try {
    const stdout = await executePowerShell(GPU_INFO_QUERY);
    const rows = parseJsonObjectList(stdout);
    const preferred =
      rows.find((row) => {
        const name = toText(row.Name).toLowerCase();
        return !name.includes('microsoft basic render');
      }) || rows[0];

    if (preferred) {
      info.gpu = {
        name: toText(preferred.Name),
        vendor: toText(preferred.AdapterCompatibility),
        driver: toText(preferred.DriverVersion),
        driverDate: toText(preferred.DriverDate),
        processor: toText(preferred.VideoProcessor),
      };
    }
  } catch (e: unknown) {
    try {
      await logError(`[collectDeviceInfo] GPU query failed: ${formatUnknownError(e)}`);
    } catch {}
  }

  return info;
}

export async function readAppLog(): Promise<string> {
  try {
    const fs = await import('@tauri-apps/plugin-fs');
    const exists = await fs.exists(LOG_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    if (!exists) return '';
    const text = await fs.readTextFile(LOG_FILE, { baseDir: fs.BaseDirectory.AppConfig });
    return text || '';
  } catch (e: unknown) {
    try {
      await logError(`[readAppLog] failed: ${formatUnknownError(e)}`);
    } catch {}
    return '';
  }
}
