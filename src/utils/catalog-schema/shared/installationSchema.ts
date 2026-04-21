import * as z from 'zod';
import { nonEmptyStringArraySchema, nonEmptyStringSchema } from './commonSchema';

export const directUrlInstallerSourceSchema = z.object({
  type: z.literal('directUrl'),
  url: nonEmptyStringSchema,
});

export const boothInstallerSourceSchema = z.object({
  type: z.literal('booth'),
  url: nonEmptyStringSchema,
});

export const githubReleaseInstallerSourceSchema = z.object({
  type: z.literal('githubRelease'),
  owner: nonEmptyStringSchema,
  repo: nonEmptyStringSchema,
  pattern: nonEmptyStringSchema,
});

export const googleDriveInstallerSourceSchema = z.object({
  type: z.literal('googleDrive'),
  id: nonEmptyStringSchema,
});

export const installationSourceSchema = z.discriminatedUnion('type', [
  directUrlInstallerSourceSchema,
  boothInstallerSourceSchema,
  githubReleaseInstallerSourceSchema,
  googleDriveInstallerSourceSchema,
]);

export const downloadInstallStepSchema = z.object({
  action: z.literal('download'),
});

export const extractInstallStepSchema = z.object({
  action: z.literal('extract'),
  from: nonEmptyStringSchema.optional(),
  to: nonEmptyStringSchema.optional(),
});

export const extractSfxInstallStepSchema = z.object({
  action: z.literal('extractSfx'),
  from: nonEmptyStringSchema.optional(),
  to: nonEmptyStringSchema.optional(),
});

export const copyInstallStepSchema = z.object({
  action: z.literal('copy'),
  from: nonEmptyStringSchema,
  to: nonEmptyStringSchema,
});

export const deleteInstallStepSchema = z.object({
  action: z.literal('delete'),
  path: nonEmptyStringSchema,
});

export const runInstallStepSchema = z.object({
  action: z.literal('run'),
  path: nonEmptyStringSchema,
  args: nonEmptyStringArraySchema.optional(),
  elevate: z.boolean().optional(),
});

export const runAuoSetupInstallStepSchema = z.object({
  action: z.literal('runAuoSetup'),
  path: nonEmptyStringSchema,
});

export const installStepSchema = z.discriminatedUnion('action', [
  downloadInstallStepSchema,
  extractInstallStepSchema,
  extractSfxInstallStepSchema,
  copyInstallStepSchema,
  deleteInstallStepSchema,
  runInstallStepSchema,
  runAuoSetupInstallStepSchema,
]);

export const uninstallStepSchema = z.discriminatedUnion('action', [deleteInstallStepSchema, runInstallStepSchema]);

export const installationSchema = z.object({
  source: installationSourceSchema,
  installSteps: z.array(installStepSchema),
  uninstallSteps: z.array(uninstallStepSchema),
});

export type Installation = z.infer<typeof installationSchema>;
