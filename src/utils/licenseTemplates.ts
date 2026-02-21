import apache20TextRaw from '../assets/licenses/Apache-2.0.txt?raw';
import bsd2ClauseTextRaw from '../assets/licenses/BSD-2-Clause.txt?raw';
import bsd3ClauseTextRaw from '../assets/licenses/BSD-3-Clause.txt?raw';
import cc0TextRaw from '../assets/licenses/CC0-1.0.txt?raw';
import gpl20TextRaw from '../assets/licenses/GPL-2.0.txt?raw';
import gpl30TextRaw from '../assets/licenses/GPL-3.0.txt?raw';
import mitTextRaw from '../assets/licenses/MIT.txt?raw';
import unlicenseTextRaw from '../assets/licenses/Unlicense.txt?raw';

export const LICENSE_TEMPLATES = {
  MIT: mitTextRaw.trim(),
  'Apache-2.0': apache20TextRaw.trim(),
  'BSD-2-Clause': bsd2ClauseTextRaw.trim(),
  'BSD-3-Clause': bsd3ClauseTextRaw.trim(),
  'CC0-1.0': cc0TextRaw.trim(),
  'GPL-2.0': gpl20TextRaw.trim(),
  'GPL-3.0': gpl30TextRaw.trim(),
  Unlicense: unlicenseTextRaw.trim(),
} as const;

type LicenseTemplateType = keyof typeof LICENSE_TEMPLATES;
type LicenseTypeOptionValue = LicenseTemplateType | 'その他' | '不明';

interface LicenseTypeOption {
  value: LicenseTypeOptionValue;
  label: string;
}

interface LicenseCopyrightLike {
  years?: unknown;
  holder?: unknown;
}

interface LicenseLike {
  type?: unknown;
  isCustom?: unknown;
  licenseBody?: unknown;
  copyrights?: unknown;
}

export const LICENSE_TEMPLATE_TYPE_VALUES = Object.keys(LICENSE_TEMPLATES) as LicenseTemplateType[];
const COPYRIGHT_PLACEHOLDER_RE = /<years>|<holder>/i;

export const LICENSE_TYPE_OPTIONS: ReadonlyArray<LicenseTypeOption> = [
  ...LICENSE_TEMPLATE_TYPE_VALUES.map((value) => ({ value, label: value })),
  { value: 'その他', label: 'その他' },
  { value: '不明', label: '不明' },
];

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isLicenseTemplateType(value: unknown): value is LicenseTemplateType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LICENSE_TEMPLATES, value);
}

function normalizeCopyrightEntries(copyrights: unknown): LicenseCopyrightLike[] {
  if (!Array.isArray(copyrights)) return [];
  return copyrights
    .filter((entry): entry is LicenseCopyrightLike => typeof entry === 'object' && entry !== null)
    .map((entry) => ({
      years: entry.years,
      holder: entry.holder,
    }));
}

function resolvePrimaryCopyright(entries: LicenseCopyrightLike[]): { years: string; holder: string } {
  const primary =
    entries.find((entry) => toTrimmedString(entry.years) || toTrimmedString(entry.holder)) || entries[0] || {};
  return {
    years: toTrimmedString(primary.years),
    holder: toTrimmedString(primary.holder),
  };
}

function fillLicensePlaceholders(text: string, years: string, holder: string): string {
  return text
    .replace(/<years>/gi, years)
    .replace(/<holder>/gi, holder)
    .trim();
}

function buildTemplateBody(type: unknown, years: string, holder: string): string {
  if (!isLicenseTemplateType(type)) return '';
  return fillLicensePlaceholders(LICENSE_TEMPLATES[type], years, holder);
}

export function requiresTemplateCopyrightFields(type: unknown): boolean {
  if (!isLicenseTemplateType(type)) return false;
  return COPYRIGHT_PLACEHOLDER_RE.test(LICENSE_TEMPLATES[type]);
}

export function buildLicenseBody(license: LicenseLike | null | undefined): string {
  if (!license || typeof license !== 'object') return '';

  const customBody = toTrimmedString(license.licenseBody);
  if (license.isCustom === true && customBody) {
    return customBody;
  }

  const copyrights = normalizeCopyrightEntries(license.copyrights);
  const primaryCopyright = resolvePrimaryCopyright(copyrights);
  const templateBody = buildTemplateBody(license.type, primaryCopyright.years, primaryCopyright.holder);

  if (license.isCustom === true) {
    return templateBody;
  }

  return templateBody || customBody;
}
