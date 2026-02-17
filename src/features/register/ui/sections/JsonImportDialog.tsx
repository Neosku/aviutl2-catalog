/**
 * カタログ JSON の部分上書き入力ダイアログ
 */
import React from 'react';
import { FileBraces } from 'lucide-react';

interface RegisterJsonImportDialogProps {
  open: boolean;
  value: string;
  error: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
}

export default function RegisterJsonImportDialog({
  open,
  value,
  error,
  onChange,
  onClose,
  onApply,
}: RegisterJsonImportDialogProps) {
  const templateJsonUrl = 'https://github.com/Neosku/aviutl2-catalog-data/blob/main/template.json';
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <h3 className="inline-flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
            <FileBraces size={18} />
            JSON 入力
          </h3>
        </div>
        <div className="space-y-3 px-6 py-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <a
              href={templateJsonUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-blue-600 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-500 dark:hover:text-blue-300"
            >
              template.json
            </a>{' '}
            と同じ形式の JSON を貼り付けてください。 一致する項目は部分上書きし、未一致の
            idは新規追加します。複数パッケージをまとめて追加することもできます。
          </p>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`[\n  {\n    "id": "author.pluginName",\n    "name": "Example Plugin",\n    "type": "入力プラグイン",\n    "summary": "プラグインの概要がここに入ります。"\n  },\n  {\n    "id": "author.scriptName",\n    "name": "Example Script",\n    "type": "スクリプト",\n    "summary": "スクリプトの概要がここに入ります。"\n  }\n]`}
            className="h-80 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-5 text-slate-800 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={onApply}
          >
            適用
          </button>
        </div>
      </div>
    </div>
  );
}
