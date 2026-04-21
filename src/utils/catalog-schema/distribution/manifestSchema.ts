import * as z from 'zod';
import { generatedAtSchema, localeSchema, nonEmptyStringSchema, sha256Schema } from '../shared';

const manifestPathEntrySchema = z.object({
  path: nonEmptyStringSchema,
  sha256: sha256Schema,
});

const manifestArtifactSchema = z.object({
  json: manifestPathEntrySchema.optional(),
  zstd: manifestPathEntrySchema,
});

export const manifestSchema = z
  .object({
    schemaVersion: z.number().int().nonnegative(),
    generatedAt: generatedAtSchema,
    fallbackLocale: localeSchema,
    locales: z.array(localeSchema).min(1),
    paths: z.object({
      list: z.record(localeSchema, manifestArtifactSchema),
      detail: z.record(localeSchema, manifestArtifactSchema),
      versions: manifestArtifactSchema,
      metrics: manifestArtifactSchema,
      install: manifestArtifactSchema,
    }),
  })
  .superRefine((value, ctx) => {
    if (!value.locales.includes(value.fallbackLocale)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fallbackLocale must be included in locales',
        path: ['fallbackLocale'],
      });
    }

    for (const locale of value.locales) {
      if (!value.paths.list[locale]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `paths.list.${locale} is required`,
          path: ['paths', 'list', locale],
        });
      }
      if (!value.paths.detail[locale]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `paths.detail.${locale} is required`,
          path: ['paths', 'detail', locale],
        });
      }
    }
  });

export type CatalogManifest = z.infer<typeof manifestSchema>;
