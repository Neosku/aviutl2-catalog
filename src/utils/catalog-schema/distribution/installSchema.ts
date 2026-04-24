import * as z from 'zod';
import { catalogPackageIdSchema, generatedAtSchema, installationSchema, relationSetSchema } from '../shared';

export const catalogInstallPackageSchema = z.object({
  relations: relationSetSchema.optional(),
  installation: installationSchema,
});

export const catalogInstallSchema = z.object({
  schemaVersion: z.number().int().nonnegative(),
  generatedAt: generatedAtSchema,
  packages: z.record(catalogPackageIdSchema, catalogInstallPackageSchema),
});

export type CatalogInstallPackage = z.infer<typeof catalogInstallPackageSchema>;
export type CatalogInstall = z.infer<typeof catalogInstallSchema>;
