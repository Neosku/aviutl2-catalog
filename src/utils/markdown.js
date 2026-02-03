import React from 'react';
import { marked } from 'marked';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertCircle, AlertOctagon, AlertTriangle, Info, Lightbulb } from 'lucide-react';

const CALLOUT_META = {
  NOTE: { title: '注記', className: 'note', icon: 'callout-note' },
  TIP: { title: 'ヒント', className: 'tip', icon: 'callout-tip' },
  IMPORTANT: { title: '重要', className: 'important', icon: 'callout-important' },
  WARNING: { title: '警告', className: 'warning', icon: 'callout-warning' },
  CAUTION: { title: '注意', className: 'caution', icon: 'callout-caution' },
};

const CALLOUT_LABEL_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;
const CALLOUT_ICON_CACHE = new Map();
const CALLOUT_ICON_COMPONENTS = {
  'callout-note': Info,
  'callout-tip': Lightbulb,
  'callout-important': AlertOctagon,
  'callout-warning': AlertTriangle,
  'callout-caution': AlertCircle,
};

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export function renderMarkdown(md = '') {
  if (!md) return '';
  const text = String(md).replace(/\r\n?/g, '\n');
  // 生の HTML は受け付けず、Markdown のみをパースするために一旦エスケープ
  const escaped = escapeHtml(text);
  marked.setOptions({ mangle: false, headerIds: false, breaks: true, gfm: true });
  try {
    const parsed = marked.parse(escaped);
    return enhanceMarkdownHtml(parsed);
  } catch {
    // パース失敗時は簡易フォールバック
    return escaped.replace(/\n/g, '<br/>');
  }
}

function enhanceMarkdownHtml(html) {
  if (!html || typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return html || '';
  }
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  transformCallouts(tpl.content);
  convertTableLiteralBreaks(tpl.content);
  return tpl.innerHTML;
}

function transformCallouts(root) {
  if (!root?.querySelectorAll) return;
  const blockquotes = root.querySelectorAll('blockquote');
  blockquotes.forEach((blockquote) => {
    const firstElement = Array.from(blockquote.childNodes).find((node) => node.nodeType === Node.ELEMENT_NODE);
    if (!firstElement || firstElement.tagName !== 'P') return;
    const markerMatch = (firstElement.textContent || '').match(CALLOUT_LABEL_RE);
    if (!markerMatch) return;
    const typeKey = markerMatch[1].toUpperCase();
    const meta = CALLOUT_META[typeKey];
    if (!meta) return;

    // Remove the marker text and leading <br/> if present
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
    const iconMarkup = getCalloutIconMarkup(meta.icon);
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

function removeLeadingWhitespaceNodes(blockquote) {
  while (blockquote.firstChild && isIgnorableNode(blockquote.firstChild)) {
    blockquote.removeChild(blockquote.firstChild);
  }
}

function isIgnorableNode(node) {
  if (!node) return false;
  if (node.nodeType === Node.TEXT_NODE) {
    return !(node.textContent || '').trim();
  }
  if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
    return true;
  }
  return false;
}

function getCalloutIconMarkup(iconName) {
  if (!iconName) return '';
  const IconComponent = CALLOUT_ICON_COMPONENTS[iconName];
  if (!IconComponent) return '';
  if (!CALLOUT_ICON_CACHE.has(iconName)) {
    const element = React.createElement(IconComponent, {
      size: 16,
      strokeWidth: 1.8,
      'aria-hidden': true,
      role: 'presentation',
    });
    const svgString = renderToStaticMarkup(element);
    CALLOUT_ICON_CACHE.set(iconName, svgString);
  }
  return CALLOUT_ICON_CACHE.get(iconName);
}

function convertTableLiteralBreaks(root) {
  if (!root?.querySelectorAll) return;
  const cells = root.querySelectorAll('td, th');
  cells.forEach((cell) => replaceLiteralBreaks(cell));
}

function replaceLiteralBreaks(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodesToProcess = [];
  while (true) {
    const node = walker.nextNode();
    if (!node) break;
    if (/<br\s*\/?>/i.test(node.nodeValue)) {
      nodesToProcess.push(node);
    }
  }

  nodesToProcess.forEach((textNode) => {
    const parts = textNode.nodeValue.split(/(<br\s*\/?>)/i);
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
