import React, { useMemo } from 'react';
import { renderMarkdown } from '../app/markdown.js';
import Icon from './Icon.jsx';

export default function UpdateDialog({ open, version, notes, busy, error, onConfirm, onCancel, publishedOn }) {
  const markdownHtml = useMemo(() => (notes ? renderMarkdown(notes) : ''), [notes]);
  if (!open) return null;

  const handleBackdrop = () => {
    if (busy) return;
    onCancel?.();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="update-title">
      <div className="modal__backdrop" onClick={handleBackdrop} />
      <div className="modal__dialog modal__dialog--update">
        <div className="modal__header update-dialog__header">
          <div>
            <span className="update-dialog__eyebrow">アップデート</span>
            <h3 id="update-title" className="modal__title">新しいバージョンが利用可能です</h3>
            {publishedOn && (
              <p className="update-dialog__meta">
                <Icon name="calendar" size={16} strokeWidth={1.8} />
                <span>公開日 {publishedOn}</span>
              </p>
            )}
          </div>
          {version && <span className="update-dialog__version">v{version}</span>}
        </div>
        <div className="modal__body update-dialog__body">
          {error && <div className="error" role="alert">{error}</div>}
          {markdownHtml
            ? <div className="md update-dialog__notes" dangerouslySetInnerHTML={{ __html: markdownHtml }} />
            : <p className="update-dialog__fallback">更新内容の詳細は取得できませんでした。</p>}
        </div>
        <div className="modal__actions update-dialog__actions">
          <button className="btn" onClick={onCancel} disabled={busy}>後で</button>
          <button className="btn btn--primary" onClick={onConfirm} disabled={busy}>
            {busy ? (<><span className="spinner" aria-hidden></span> 更新中…</>) : '今すぐ更新'}
          </button>
        </div>
      </div>
    </div>
  );
}
