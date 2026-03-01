import { MarkdownExit } from 'markdown-exit';

/** raw.githubusercontent.comのURLをGitHubと同じ仕様で解釈する。 */
export function resolveGithubLink(md: MarkdownExit): void {
  const defaultLinkRenderer =
    md.renderer.rules.link_open || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const baseUrl = env.baseUrl || '';
    const githubUrlInfo =
      /^https:\/\/raw\.githubusercontent\.com\/(?<user>[^/]+)\/(?<repo>[^/]+)\/(?<branch>[^/]+)\/(?<path>.*)$/.exec(
        baseUrl,
      )?.groups;
    if (!githubUrlInfo) {
      return defaultLinkRenderer(tokens, idx, options, env, self);
    }
    console.log('githubUrlInfo', githubUrlInfo);

    const { user, repo, branch, path } = githubUrlInfo;
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');
    if (hrefIndex >= 0) {
      const href = token.attrs?.[hrefIndex]?.[1] || '';

      // `/`：リポジトリルート。
      if (href.startsWith('/')) {
        token.attrs![hrefIndex][1] = `https://github.com/${user}/${repo}/blob/${branch}${href}`;
      } else if (!/^https?:\/\//.test(href)) {
        // 相対パス。baseUrlのGitHub上の位置を基準に解決する。
        const baseUrl = `https://github.com/${user}/${repo}/blob/${branch}/${path}`;
        try {
          const resolvedUrl = new URL(href, baseUrl);
          token.attrs![hrefIndex][1] = resolvedUrl.href;
        } catch {
          // URLの解決に失敗した場合はhrefを変更しない。
        }
      }
    }

    return defaultLinkRenderer(tokens, idx, options, env, self);
  };
}
