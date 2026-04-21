import * as z from 'zod';
import {
  catalogLicenseSchema,
  catalogPackageIdSchema,
  generatedAtSchema,
  localeSchema,
  markdownRefSchema,
  nonEmptyStringArraySchema,
  nonEmptyStringSchema,
} from '../shared';

export const catalogDetailPackageSchema = z.object({
  packagePageUrl: nonEmptyStringSchema,
  originalAuthor: nonEmptyStringSchema.optional(),
  description: markdownRefSchema,
  notice: markdownRefSchema.optional(),
  licenses: z.array(catalogLicenseSchema),
  images: z
    .object({
      detailImages: nonEmptyStringArraySchema.optional(),
    })
    .optional(),
});

export const catalogDetailSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  locale: localeSchema,
  generatedAt: generatedAtSchema,
  packages: z.record(catalogPackageIdSchema, catalogDetailPackageSchema),
});

export type CatalogDetail = z.infer<typeof catalogDetailSchema>;
