import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { renderMarkdown } from '../../utils/markdown';

interface UpdateDialogProps {
  open: boolean;
  version?: string;
  notes?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
  publishedOn?: string;
}

export default function UpdateDialog({
  open,
  version,
  notes,
  busy = false,
  error,
  onConfirm,
  onCancel,
  publishedOn,
}: UpdateDialogProps) {
  const markdownHtml = useMemo(() => (notes ? renderMarkdown(notes) : ''), [notes]);
  const markdownMarkup = useMemo(() => ({ __html: markdownHtml }), [markdownHtml]);
  if (!open) return null;

  const handleBackdrop = () => {
    if (busy) return;
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="閉じる" className="absolute inset-0 bg-black/50" onClick={handleBackdrop} />
      <div
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">アップデート</span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100" id="update-title">
              新しいバージョンが利用可能です
            </h3>
            {publishedOn && (
              <p className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Calendar size={14} />
                <span>公開日 {publishedOn}</span>
              </p>
            )}
          </div>
          {version && (
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">v{version}</span>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}
          {markdownHtml ? (
            <div className="min-h-0 overflow-y-auto pr-1">
              <div
                className="prose prose-slate max-w-none break-words dark:prose-invert"
                dangerouslySetInnerHTML={markdownMarkup}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">更新内容の詳細は取得できませんでした。</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button className="btn" onClick={onCancel} disabled={busy} type="button">
            後で
          </button>
          <button className="btn btn--primary" onClick={onConfirm} disabled={busy} type="button">
            {busy ? '更新中…' : '今すぐ更新'}
          </button>
        </div>
      </div>
    </div>
  );
}
