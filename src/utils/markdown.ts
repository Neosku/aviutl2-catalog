import React from 'react';
import { type LucideIcon, AlertCircle, AlertOctagon, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { marked } from 'marked';
import { renderToStaticMarkup } from 'react-dom/server';

interface CalloutMeta {
  title: string;
  className: string;
  icon: LucideIcon;
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

function isElementNode(node: ChildNode): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function renderMarkdown(md: unknown = ''): string {
  if (md == null) return '';
  const text = String(md).replace(/\r\n?/g, '\n');
  if (!text) return '';
  // 生の HTML は受け付けず、Markdown のみをパースするために一旦エスケープ
  const escaped = escapeHtml(text);
  try {
    const parsed = marked.parse(escaped, MARKED_PARSE_OPTIONS);
    if (typeof parsed !== 'string') {
      return fallbackHtml(escaped);
    }
    return enhanceMarkdownHtml(parsed);
  } catch {
    // パース失敗時は簡易フォールバック
    return fallbackHtml(escaped);
  }
}

function enhanceMarkdownHtml(html: string): string {
  if (!html || typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return html || '';
  }
  const hasCalloutCandidate = html.includes('<blockquote') && html.includes('[!');
  const hasTableBreakCandidate = html.includes('<table') && html.includes('<br');
  if (!hasCalloutCandidate && !hasTableBreakCandidate) {
    return html;
  }
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  if (hasCalloutCandidate) {
    transformCallouts(tpl.content);
  }
  if (hasTableBreakCandidate) {
    convertTableLiteralBreaks(tpl.content);
  }
  return tpl.innerHTML;
}

function transformCallouts(root: ParentNode): void {
  const blockquotes = root.querySelectorAll('blockquote');
  blockquotes.forEach((blockquote) => {
    const firstElement = Array.from(blockquote.childNodes).find(isElementNode);
    if (!firstElement || firstElement.tagName !== 'P') return;

    const markerMatch = (firstElement.textContent || '').match(CALLOUT_LABEL_RE);
    if (!markerMatch) return;

    const typeKey = parseCalloutType(markerMatch[1]);
    if (!typeKey) return;
    const meta = CALLOUT_META[typeKey];

    const strippedHtml = (firstElement.innerHTML || '')
      .replace(CALLOUT_LABEL_RE, '')
      .replace(/^(<br\s*\/?>)+/i, '')
      .trimStart();
    if (strippedHtml) {
      firstElement.innerHTML = strippedHtml;
    } else {
      firstElement.remove();
    }

    removeLeadingWhitespaceNodes(blockquote);

    const wrapper = document.createElement('div');
    wrapper.className = `md-callout md-callout--${meta.className}`;
    wrapper.setAttribute('data-callout', typeKey.toLowerCase());

    const title = document.createElement('div');
    title.className = 'md-callout__title';
    const iconMarkup = getCalloutIconMarkup(typeKey);
    if (iconMarkup) {
      const iconEl = document.createElement('span');
      iconEl.className = 'md-callout__icon';
      iconEl.innerHTML = iconMarkup;
      title.appendChild(iconEl);
    }
    const labelEl = document.createElement('span');
    labelEl.className = 'md-callout__label';
    labelEl.textContent = meta.title;
    title.appendChild(labelEl);
    wrapper.appendChild(title);

    const body = document.createElement('div');
    body.className = 'md-callout__body';
    while (blockquote.firstChild) {
      body.appendChild(blockquote.firstChild);
    }
    wrapper.appendChild(body);

    blockquote.replaceWith(wrapper);
  });
}

function removeLeadingWhitespaceNodes(blockquote: Element): void {
  while (blockquote.firstChild && isIgnorableNode(blockquote.firstChild)) {
    blockquote.removeChild(blockquote.firstChild);
  }
}

function isIgnorableNode(node: ChildNode | null): boolean {
  if (!node) return false;
  if (node.nodeType === Node.TEXT_NODE) {
    return !(node.textContent || '').trim();
  }
  if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') {
    return true;
  }
  return false;
}

function getCalloutIconMarkup(type: CalloutType): string {
  const IconComponent = CALLOUT_META[type].icon;
  if (!CALLOUT_ICON_CACHE.has(type)) {
    const element = React.createElement(IconComponent, {
      size: 16,
      strokeWidth: 1.8,
      'aria-hidden': true,
      role: 'presentation',
    });
    const svgString = renderToStaticMarkup(element);
    CALLOUT_ICON_CACHE.set(type, svgString);
  }
  return CALLOUT_ICON_CACHE.get(type) || '';
}

function convertTableLiteralBreaks(root: ParentNode): void {
  const cells = root.querySelectorAll('td, th');
  cells.forEach((cell) => replaceLiteralBreaks(cell));
}

function replaceLiteralBreaks(element: Element): void {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodesToProcess: Text[] = [];
  while (true) {
    const node = walker.nextNode();
    if (!node) break;
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const textNode = node as Text;
    const value = textNode.nodeValue;
    if (typeof value === 'string' && /<br\s*\/?>/i.test(value)) {
      nodesToProcess.push(textNode);
    }
  }

  nodesToProcess.forEach((textNode) => {
    const parts = (textNode.nodeValue || '').split(/(<br\s*\/?>)/i);
    const fragment = document.createDocumentFragment();
    parts.forEach((part) => {
      if (!part) return;
      if (/<br\s*\/?>/i.test(part)) {
        fragment.appendChild(document.createElement('br'));
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    textNode.replaceWith(fragment);
  });
}
