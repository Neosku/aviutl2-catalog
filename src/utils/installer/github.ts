import * as tauriHttp from '@tauri-apps/plugin-http';
import type { GithubSource } from '../catalogSchema';
import { formatUnknownError } from '../errors';
import { logError } from '../logging';

type GitHubAsset = {
  name?: string;
  browser_download_url?: string;
  updated_at?: string;
  created_at?: string;
};

type GitHubRelease = {
  assets?: unknown;
  published_at?: string;
  created_at?: string;
};

function pickAssetFromRelease(release: unknown, regex: RegExp | null): GitHubAsset | null {
  const releaseLike = release as GitHubRelease | null;
  if (!releaseLike || !Array.isArray(releaseLike.assets)) return null;
  const assets = releaseLike.assets as GitHubAsset[];
  if (regex) {
    const matched = assets.find((a) => regex.test(a.name || ''));
    if (matched) return matched;
  }
  return assets[0] || null;
}

function findLatestUpdatedAsset(releases: unknown, regex: RegExp | null): GitHubAsset | null {
  if (!Array.isArray(releases) || !releases.length) return null;
  let best: GitHubAsset | null = null;
  let bestTs = -Infinity;
  for (const rel of releases) {
    const releaseLike = rel as GitHubRelease;
    const assets = Array.isArray(releaseLike?.assets) ? (releaseLike.assets as GitHubAsset[]) : [];
    for (const asset of assets) {
      if (regex && !regex.test(asset?.name || '')) continue;
      const ts =
        Date.parse(
          asset?.updated_at || asset?.created_at || releaseLike?.published_at || releaseLike?.created_at || '',
        ) || 0;
      if (ts > bestTs) {
        best = asset;
        bestTs = ts;
      }
    }
  }
  return best;
}

export async function fetchGitHubURL(github: GithubSource): Promise<string> {
  const { owner, repo, pattern } = github;
  const regex = pattern ? new RegExp(pattern) : null;

  try {
    const res = await tauriHttp.fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
    const data = await res.json().catch(() => ({}));
    const asset = pickAssetFromRelease(data, regex);
    if (asset?.browser_download_url) {
      return asset.browser_download_url;
    }
  } catch (e: unknown) {
    try {
      await logError(`[fetchGitHubAsset] fetch latest failed: ${formatUnknownError(e)}`);
    } catch {}
  }

  try {
    const res = await tauriHttp.fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`);
    const list = await res.json().catch(() => []);
    const asset = findLatestUpdatedAsset(list, regex);
    return asset?.browser_download_url || '';
  } catch (e: unknown) {
    try {
      await logError(`[fetchGitHubAsset] fetch failed: ${formatUnknownError(e)}`);
    } catch {}
    return '';
  }
}
