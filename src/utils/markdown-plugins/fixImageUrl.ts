import { MarkdownExit } from 'markdown-exit';

function resolveImageSrc(src: string, baseUrl?: string): string {
  if (!baseUrl) return src;
  try {
    const url = new URL(src, baseUrl);
    return url.href;
  } catch {
    return src;
  }
}
/** 画像リンクを渡されたbaseUrlを基準に変換する。 */
export function fixImageUrl(md: MarkdownExit): void {
  const defaultImageRenderer =
    md.renderer.rules.image || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const srcIndex = token.attrIndex('src');
    if (srcIndex >= 0) {
      const src = token.attrs?.[srcIndex]?.[1] || '';
      const resolvedSrc = resolveImageSrc(src, env.baseUrl);
      token.attrs![srcIndex][1] = resolvedSrc;
    }
    return defaultImageRenderer(tokens, idx, options, env, self);
  };
}
