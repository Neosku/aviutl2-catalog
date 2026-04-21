import * as z from 'zod';

export const catalogLicenseTypeValues = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'GPL-2.0',
  'GPL-3.0',
  'CC0-1.0',
  'Unlicense',
  'custom',
  'unknown',
] as const;

export const catalogLicenseTypeSchema = z.enum(catalogLicenseTypeValues);

export type CatalogLicenseType = z.infer<typeof catalogLicenseTypeSchema>;
