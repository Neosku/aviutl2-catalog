import { i18n } from '@/i18n';
import * as tauriHttp from '@tauri-apps/plugin-http';
import type { InstallerSource } from './types';
import { formatUnknownError } from '../errors';
import { logError } from '../logging';

type GithubSource = Extract<InstallerSource, { type: 'githubRelease' }>;

type GitHubAsset = {
  name?: string;
  browser_download_url?: string;
  updated_at?: string;
  created_at?: string;
};

type GitHubRelease = {
  assets?: GitHubAsset[];
  published_at?: string;
  created_at?: string;
  name?: string;
  tag_name?: string;
  prerelease?: boolean;
};

class GitHubPrimaryRateLimitError extends Error {
  readonly resetAtUnixSeconds: number;

  constructor(resetAtUnixSeconds: number) {
    super(i18n.t('common:github.rateLimit', { resetAt: formatResetAt(resetAtUnixSeconds) }));
    this.name = 'GitHubPrimaryRateLimitError';
    this.resetAtUnixSeconds = resetAtUnixSeconds;
  }
}

function formatResetAt(resetAtUnixSeconds: number): string {
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(resetAtUnixSeconds * 1000));
}

function toPrimaryRateLimitError(response: Response): Error | null {
  if (response.status !== 403 && response.status !== 429) return null;
  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = response.headers.get('x-ratelimit-reset');
  if (remaining !== '0' || !reset) return null;
  const resetAt = Number(reset);
  if (!Number.isFinite(resetAt) || resetAt <= 0) return null;
  return new GitHubPrimaryRateLimitError(resetAt);
}

async function throwIfPrimaryRateLimited(response: Response, context: string): Promise<void> {
  const rateLimitError = toPrimaryRateLimitError(response);
  if (!rateLimitError) return;
  await logError(`[fetchGitHubAsset] rate limit ${context}: ${rateLimitError.message}`);
  throw rateLimitError;
}

function pickAssetFromRelease(release: unknown, regex: RegExp): GitHubAsset | null {
  const releaseLike = release as GitHubRelease | null;
  if (!releaseLike || !Array.isArray(releaseLike.assets)) return null;
  return releaseLike.assets.find((asset) => regex.test(asset.name || '')) || null;
}

function findLatestRelease(releases: unknown): GitHubRelease | null {
  if (!Array.isArray(releases) || !releases.length) return null;
  let best: GitHubRelease | null = null;
  let bestTs = -Infinity;
  for (const rel of releases) {
    const releaseLike = rel as GitHubRelease;
    const ts = Date.parse(releaseLike?.published_at || releaseLike?.created_at || '') || 0;
    if (ts > bestTs) {
      best = releaseLike;
      bestTs = ts;
    }
  }
  return best;
}

function describeRelease(release: GitHubRelease | null): string {
  if (!release) return 'unknown';
  const label = String(release.name || release.tag_name || '').trim();
  if (!label) return 'unknown';
  return release.prerelease ? `${label} (prerelease)` : label;
}

async function fetchLatestRelease(owner: string, repo: string): Promise<GitHubRelease | null> {
  try {
    const res = await tauriHttp.fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
    if (!res.ok) {
      await throwIfPrimaryRateLimited(res, `latest repo=${owner}/${repo}`);
      if (res.status !== 404) {
        await logError(`[fetchGitHubAsset] fetch latest failed: HTTP ${res.status} repo=${owner}/${repo}`);
      }
      return null;
    }
    return (await res.json().catch(() => null)) as GitHubRelease | null;
  } catch (e: unknown) {
    if (e instanceof GitHubPrimaryRateLimitError) {
      throw e;
    }
    try {
      await logError(`[fetchGitHubAsset] fetch latest failed: ${formatUnknownError(e)}`);
    } catch {}
    return null;
  }
}

async function fetchNewestRelease(owner: string, repo: string): Promise<GitHubRelease | null> {
  const res = await tauriHttp.fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`);
  if (!res.ok) {
    await throwIfPrimaryRateLimited(res, `releases repo=${owner}/${repo}`);
    throw new Error(`GitHub releases API returned HTTP ${res.status}`);
  }
  const list = await res.json().catch(() => []);
  return findLatestRelease(list);
}

export async function fetchGitHubURL(github: GithubSource): Promise<string> {
  const { owner, repo, pattern } = github;
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch (e: unknown) {
    throw new Error(`GitHub asset pattern is invalid: ${formatUnknownError(e)}`, { cause: e });
  }

  const latestRelease = await fetchLatestRelease(owner, repo);
  const targetRelease = latestRelease ?? (await fetchNewestRelease(owner, repo));
  if (!targetRelease) {
    throw new Error(`GitHub release not found: ${owner}/${repo}`);
  }

  const asset = pickAssetFromRelease(targetRelease, regex);
  if (!asset?.browser_download_url) {
    const error = new Error(
      `GitHub release asset not found for pattern "${pattern}" in ${owner}/${repo} release ${describeRelease(targetRelease)}`,
    );
    try {
      await logError(`[fetchGitHubAsset] fetch failed: ${formatUnknownError(error)}`);
    } catch {}
    throw error;
  }
  return asset.browser_download_url;
}
