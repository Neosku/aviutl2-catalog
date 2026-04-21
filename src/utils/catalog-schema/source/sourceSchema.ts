import * as z from 'zod';
import {
  catalogLicenseSchema,
  catalogPackageIdSchema,
  catalogPackageRoleSchema,
  catalogPackageTypeSchema,
  catalogVersionSchema,
  deprecationSchema,
  installationSchema,
  isoDateSchema,
  markdownRefSchema,
  nonEmptyStringArraySchema,
  nonEmptyStringSchema,
  relationSetSchema,
  relativePathOrUrlSchema,
} from '../shared';

export const sourceMetaSchema = z.object({
  id: catalogPackageIdSchema,
  legacyId: nonEmptyStringSchema,
  packageType: catalogPackageTypeSchema,
  packageRole: catalogPackageRoleSchema,
  addedAt: isoDateSchema,
  packagePageUrl: nonEmptyStringSchema,
  niconiCommonsId: nonEmptyStringSchema.optional(),
});

export const sourceContentSchema = z.object({
  name: nonEmptyStringSchema,
  author: nonEmptyStringSchema,
  originalAuthor: nonEmptyStringSchema.optional(),
  tags: nonEmptyStringArraySchema,
  typeLabel: nonEmptyStringSchema.optional(),
  description: z.object({
    summary: nonEmptyStringSchema,
    markdownSource: relativePathOrUrlSchema,
  }),
  changelog: markdownRefSchema.optional(),
  notice: markdownRefSchema.optional(),
  deprecation: deprecationSchema.optional(),
  licenses: z.array(catalogLicenseSchema),
  images: z
    .object({
      thumbnail: relativePathOrUrlSchema.optional(),
      detailImages: z.array(relativePathOrUrlSchema).optional(),
    })
    .optional(),
});

export const sourceInstallSchema = z.object({
  relations: relationSetSchema.optional(),
  installation: installationSchema,
});

export const sourceVersionsSchema = z.object({
  versions: z.array(catalogVersionSchema).min(1),
});

export const sourcePackageSchema = z.object({
  meta: sourceMetaSchema,
  content: sourceContentSchema,
  install: sourceInstallSchema,
  versions: sourceVersionsSchema,
});

export type SourceMeta = z.infer<typeof sourceMetaSchema>;
export type SourceContent = z.infer<typeof sourceContentSchema>;
export type SourceInstall = z.infer<typeof sourceInstallSchema>;
export type SourceVersions = z.infer<typeof sourceVersionsSchema>;
