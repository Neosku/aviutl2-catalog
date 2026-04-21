import * as z from 'zod';
import {
  catalogPackageIdSchema,
  catalogPackageRoleSchema,
  catalogPackageTypeSchema,
  deprecationSchema,
  generatedAtSchema,
  isoDateSchema,
  localeSchema,
  markdownRefSchema,
  nonEmptyStringArraySchema,
  nonEmptyStringSchema,
} from '../shared';

export const catalogListPackageSchema = z
  .object({
    id: catalogPackageIdSchema,
    legacyId: nonEmptyStringSchema,
    packageType: catalogPackageTypeSchema,
    packageRole: catalogPackageRoleSchema,
    addedAt: isoDateSchema,
    name: nonEmptyStringSchema,
    author: nonEmptyStringSchema,
    typeLabel: nonEmptyStringSchema.optional(),
    tags: nonEmptyStringArraySchema,
    summary: nonEmptyStringSchema,
    changelog: markdownRefSchema.optional(),
    niconiCommonsId: nonEmptyStringSchema.optional(),
    deprecation: deprecationSchema.optional(),
    images: z.object({
      thumbnail: nonEmptyStringSchema,
    }),
  })
  .superRefine((value, ctx) => {
    if (value.packageType === 'custom' && !value.typeLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'typeLabel is required when packageType is custom',
        path: ['typeLabel'],
      });
    }
  });

export const catalogListSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  locale: localeSchema,
  generatedAt: generatedAtSchema,
  packages: z.array(catalogListPackageSchema),
});

export type CatalogListPackage = z.infer<typeof catalogListPackageSchema>;
export type CatalogList = z.infer<typeof catalogListSchema>;
