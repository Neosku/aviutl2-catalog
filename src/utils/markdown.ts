import { createElement, IconNode, AlertOctagon, AlertTriangle, Info, Lightbulb, AlertCircle } from 'lucide';
import { marked, type Tokens } from 'marked';

interface CalloutMeta {
  title: string;
  className: string;
  icon: IconNode;
}

const CALLOUT_META = {
  NOTE: { title: '注記', className: 'note', icon: Info },
  TIP: { title: 'ヒント', className: 'tip', icon: Lightbulb },
  IMPORTANT: { title: '重要', className: 'important', icon: AlertOctagon },
  WARNING: { title: '警告', className: 'warning', icon: AlertTriangle },
  CAUTION: { title: '注意', className: 'caution', icon: AlertCircle },
} as const satisfies Record<string, CalloutMeta>;

type CalloutType = keyof typeof CALLOUT_META;
const CALLOUT_TYPES = Object.keys(CALLOUT_META) as CalloutType[];
const CALLOUT_LABEL_RE = new RegExp(`^\\s*\\[!(${CALLOUT_TYPES.join('|')})\\]\\s*`, 'i');
const CALLOUT_ICON_CACHE = new Map<CalloutType, string>();
const MARKED_PARSE_OPTIONS = { breaks: true, gfm: true, async: false } as const;
const ENCODED_BR_RE = /&lt;br\s*\/?&gt;/gi;

function parseCalloutType(value: string): CalloutType | null {
  const upper = value.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(CALLOUT_META, upper)) {
    return upper as CalloutType;
  }
  return null;
}

function escapeHtml(value: unknown): string {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function fallbackHtml(escapedText: string): string {
  return escapedText.replace(/\n/g, '<br/>');
}

function getCalloutIconMarkup(type: CalloutType): string {
  const iconNode = CALLOUT_META[type].icon;
  if (!CALLOUT_ICON_CACHE.has(type)) {
    const svgString = createElement(iconNode, {
      size: 16,
      strokeWidth: 1.8,
      'aria-hidden': 'true',
      role: 'presentation',
    }).toString();
    CALLOUT_ICON_CACHE.set(type, svgString);
  }
  return CALLOUT_ICON_CACHE.get(type) || '';
}

function transformCalloutInnerHtml(innerHtml: string, type: CalloutType): string {
  const meta = CALLOUT_META[type];
  const iconMarkup = getCalloutIconMarkup(type);
  const strippedBody = innerHtml
    .replace(new RegExp(`^<p>\\s*\\[!${type}\\]\\s*(<br\\s*/?>\\s*)?`, 'i'), '<p>')
    .replace(/^<p>\s*<\/p>\s*/i, '');

  const iconHtml = iconMarkup ? `<span class="md-callout__icon">${iconMarkup}</span>` : '';
  return `<div class="md-callout md-callout--${meta.className}" data-callout="${type.toLowerCase()}"><div class="md-callout__title">${iconHtml}<span class="md-callout__label">${meta.title}</span></div><div class="md-callout__body">${strippedBody}</div></div>`;
}

marked.use({
  renderer: {
    blockquote(this, token: Tokens.Blockquote) {
      const firstToken = token.tokens[0];
      if (!firstToken || firstToken.type !== 'paragraph') return false;
      const markerMatch = (firstToken.text || '').match(CALLOUT_LABEL_RE);
      if (!markerMatch) return false;

      const typeKey = parseCalloutType(markerMatch[1]);
      if (!typeKey) return false;

      const innerHtml = this.parser.parse(token.tokens);
      return transformCalloutInnerHtml(innerHtml, typeKey);
    },
    tablecell(this, token: Tokens.TableCell) {
      const content = this.parser.parseInline(token.tokens);
      const contentWithBreaks = content.replace(ENCODED_BR_RE, '<br>');
      const type = token.header ? 'th' : 'td';
      const tag = token.align ? `<${type} align="${token.align}">` : `<${type}>`;
      return `${tag}${contentWithBreaks}</${type}>`;
    },
  },
});

export function renderMarkdown(md: unknown = ''): string {
  if (md == null) return '';
  const text = String(md).replace(/\r\n?/g, '\n');
  if (!text) return '';
  const escaped = escapeHtml(text);
  try {
    const parsed = marked.parse(escaped, MARKED_PARSE_OPTIONS);
    if (typeof parsed !== 'string') {
      return fallbackHtml(escaped);
    }
    return parsed;
  } catch {
    return fallbackHtml(escaped);
  }
}
