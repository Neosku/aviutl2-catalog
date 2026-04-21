import * as z from 'zod';
import { catalogPackageIdSchema, generatedAtSchema } from '../shared';

export const catalogMetricsPackageSchema = z.object({
  popularity: z.number(),
  trend: z.number(),
});

export const catalogMetricsSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  generatedAt: generatedAtSchema,
  packages: z.record(catalogPackageIdSchema, catalogMetricsPackageSchema),
});

export type CatalogMetrics = z.infer<typeof catalogMetricsSchema>;
