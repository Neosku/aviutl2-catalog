import * as z from 'zod';
import { isoDateSchema, nonEmptyStringSchema, xxh128Schema } from './commonSchema';

export const catalogVersionFileSchema = z.object({
  path: nonEmptyStringSchema,
  xxh128: xxh128Schema,
});

export const catalogVersionSchema = z.object({
  version: nonEmptyStringSchema,
  releaseDate: isoDateSchema,
  files: z.array(catalogVersionFileSchema).min(1),
});

export type CatalogVersion = z.infer<typeof catalogVersionSchema>;
