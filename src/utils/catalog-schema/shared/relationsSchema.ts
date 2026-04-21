import * as z from 'zod';
import { catalogPackageIdSchema, nonEmptyStringArraySchema } from './commonSchema';

export const relationSetSchema = z.object({
  requires: nonEmptyStringArraySchema.optional(),
  recommends: nonEmptyStringArraySchema.optional(),
  conflicts: nonEmptyStringArraySchema.optional(),
  similar: nonEmptyStringArraySchema.optional(),
  replaces: nonEmptyStringArraySchema.optional(),
  forkOf: catalogPackageIdSchema.optional(),
});
