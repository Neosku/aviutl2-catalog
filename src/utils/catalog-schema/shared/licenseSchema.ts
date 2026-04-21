import * as z from 'zod';
import { nonEmptyStringSchema } from './commonSchema';
import { catalogLicenseTypeSchema } from './licenseTypes';

export const catalogLicenseCopyrightSchema = z.object({
  years: nonEmptyStringSchema,
  holder: nonEmptyStringSchema,
});

export const catalogLicenseSchema = z
  .object({
    type: catalogLicenseTypeSchema,
    name: nonEmptyStringSchema.optional(),
    copyrights: z.array(catalogLicenseCopyrightSchema).optional(),
    licenseBody: nonEmptyStringSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasCopyrights = Boolean(value.copyrights?.length);
    const hasBody = Boolean(value.licenseBody);

    if (hasCopyrights && hasBody) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'copyrights and licenseBody are mutually exclusive',
        path: ['licenseBody'],
      });
    }

    if (value.type === 'custom' && !hasBody) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'licenseBody is required when type is custom',
        path: ['licenseBody'],
      });
    }
  });

export type CatalogLicense = z.infer<typeof catalogLicenseSchema>;
