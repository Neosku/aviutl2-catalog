// エラーダイアログコンポーネント
import React, { useEffect, useState } from 'react';

// エラーを表示するダイアログコンポーネント
export default function ErrorDialog({ open, title = 'エラーが発生しました', message = '', onClose }) {
  const [copied, setCopied] = useState(false);  // コピー状態を管理
  useEffect(() => { if (open) setCopied(false); }, [open]); // ダイアログが開かれたらコピー状態をリセット
  if (!open) return null; // openがfalseなら何も表示しない

  // コピーボタンを押したときの処理
  async function onCopy() {
    try {
      // クリップボードにコピー
      await navigator.clipboard.writeText(String(message || ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { }
  }

  return (
    <div
      className="modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-title"
      aria-describedby="error-message"
    >
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__dialog modal__dialog--error">
        <div className="modal__header modal__header--error">
          <div className="error-dialog__title">
            <span className="error-dialog__icon" aria-hidden>
              <svg className="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" role="presentation">
                <path d="M12.86 3.41 21 18.77c.37.7.12 1.57-.58 1.94-.2.1-.43.16-.66.16H4.24c-.79 0-1.43-.64-1.43-1.43 0-.24.06-.46.17-.67l8.15-15.36c.37-.7 1.24-.96 1.93-.58.23.13.43.32.56.58Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 9v4.5m0 2.75h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <div className="error-dialog__text">
              <p className="error-dialog__eyebrow">Error</p>
              <h3 id="error-title" className="modal__title">{title}</h3>
            </div>
          </div>
          <div className="error-dialog__copyWrap">
            <button
              className="btn btn--icon btn--ghost error-dialog__copy"
              onClick={onCopy}
              aria-label={copied ? 'コピーしました' : 'エラーメッセージをコピー'}
              title={copied ? 'コピーしました' : 'エラーメッセージをコピー'}
            >
              <svg className="icon" width="15" height="15" viewBox="0 0 20 20" fill="none" role="presentation">
                <path d="M7.5 5.5A2.5 2.5 0 0 1 10 3h5a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 15 13H10a2.5 2.5 0 0 1-2.5-2.5v-5Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M4.5 7.25H4A2.25 2.25 0 0 0 1.75 9.5v5.25A2.25 2.25 0 0 0 4 17h5.25A2.25 2.25 0 0 0 11.5 14.75V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
            {copied && <span className="error-dialog__copied" aria-live="polite">コピーしました</span>}
          </div>
        </div>
        <div className="modal__body modal__body--error">
          <pre id="error-message" className="modal__pre modal__pre--error" aria-live="polite"><code>{String(message || '')}</code></pre>
        </div>
        <div className="modal__actions">
          <button className="btn btn--primary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

