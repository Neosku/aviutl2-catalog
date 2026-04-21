import * as z from 'zod';
import { catalogPackageIdSchema, catalogVersionSchema, generatedAtSchema } from '../shared';

export const catalogVersionsPackageSchema = z.object({
  versions: z.array(catalogVersionSchema).min(1),
});

export const catalogVersionsSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  generatedAt: generatedAtSchema,
  packages: z.record(catalogPackageIdSchema, catalogVersionsPackageSchema),
});

export type CatalogVersions = z.infer<typeof catalogVersionsSchema>;
