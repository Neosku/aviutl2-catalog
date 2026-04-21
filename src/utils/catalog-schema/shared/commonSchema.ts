import * as z from 'zod';

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const generatedAtSchema = z.string().min(1);
export const localeSchema = z.string().min(1);
export const nonEmptyStringSchema = z.string().min(1);
export const sha256Schema = z.string().regex(/^[A-Fa-f0-9]{64}$/);
export const xxh128Schema = z.string().regex(/^[A-Fa-f0-9]{32}$/);

export const catalogPackageIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const catalogPackageIdSchema = z.string().regex(catalogPackageIdPattern);

export const catalogPackageTypeValues = [
  'core',
  'mod',
  'inputPlugin',
  'outputPlugin',
  'generalPlugin',
  'filterPlugin',
  'script',
  'custom',
] as const;

export const catalogPackageRoleValues = ['primaryPackage', 'supportPackage'] as const;

export const catalogPackageTypeSchema = z.enum(catalogPackageTypeValues);
export const catalogPackageRoleSchema = z.enum(catalogPackageRoleValues);

export const relativePathOrUrlSchema = z.string().min(1);
export const nonEmptyStringArraySchema = z.array(nonEmptyStringSchema);

export const markdownRefSchema = z.object({
  markdownSource: relativePathOrUrlSchema,
});

export const deprecationSchema = z.object({
  message: nonEmptyStringSchema,
});

export type CatalogPackageType = z.infer<typeof catalogPackageTypeSchema>;
export type CatalogPackageRole = z.infer<typeof catalogPackageRoleSchema>;
