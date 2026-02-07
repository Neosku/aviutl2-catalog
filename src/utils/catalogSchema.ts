import { z } from "zod";

/* ---------- primitives ---------- */

const dateYYYYMMDDSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export const copyrightSchema = z.object({
  years: z.string(),
  holder: z.string(),
});
export type Copyright = z.infer<typeof copyrightSchema>;

export const licenseSchema = z.object({
  type: z.string(),
  isCustom: z.boolean(),
  copyrights: z.array(copyrightSchema),
  licenseBody: z.string().nullable(),
});
export type License = z.infer<typeof licenseSchema>;

/* ---------- installer ---------- */

export const githubSourceSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pattern: z.string(),
});
export type GithubSource = z.infer<typeof githubSourceSchema>;

export const installerActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("download"),
  }),

  z.object({
    action: z.literal("copy"),
    from: z.string(),
    to: z.string(),
  }),

  z.object({
    action: z.literal("delete"),
    path: z.string(),
  }),
]);
export type InstallerAction = z.infer<typeof installerActionSchema>;

export const installerSchema = z.object({
  source: z.object({
    github: githubSourceSchema,
  }),
  install: z.array(installerActionSchema),
  uninstall: z.array(installerActionSchema),
});
export type Installer = z.infer<typeof installerSchema>;

/* ---------- version ---------- */

export const versionFileSchema = z.object({
  path: z.string(),
  XXH3_128: z.string(),
});
export type VersionFile = z.infer<typeof versionFileSchema>;

export const versionSchema = z.object({
  version: z.string(),
  release_date: dateYYYYMMDDSchema,
  file: z.array(versionFileSchema),
});
export type Version = z.infer<typeof versionSchema>;

/* ---------- catalog entry ---------- */

export const catalogEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  summary: z.string(),
  description: z.string(),
  author: z.string(),
  repoURL: z.string(),
  "latest-version": z.string(),
  popularity: z.number(),
  trend: z.number(),

  licenses: z.array(licenseSchema),

  niconiCommonsId: z.string().nullable().optional(),

  tags: z.array(z.string()),
  dependencies: z.array(z.string()),
  images: z.array(z.string()),

  installer: installerSchema,
  version: z.array(versionSchema),
});
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

/* ---------- root ---------- */

export const catalogIndexSchema = z.array(catalogEntrySchema);
export type CatalogIndex = z.infer<typeof catalogIndexSchema>;
