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
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="error-title">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__dialog">
        <div className="modal__header">
          <h3 id="error-title" className="modal__title">{title}</h3>
        </div>
        <div className="modal__body">
          <pre className="modal__pre" aria-live="polite"><code>{String(message || '')}</code></pre>
        </div>
        <div className="modal__actions">
          <button className="btn" onClick={onCopy}>{copied ? 'コピーしました' : 'コピー'}</button>
          <button className="btn btn--primary" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

