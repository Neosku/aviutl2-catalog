/**
 * 詳細説明エリアの表示コンポーネント
 */
import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import type { RegisterDescriptionSectionProps } from '../types';

export default function RegisterDescriptionSection({
  packageForm,
  descriptionTab,
  descriptionLoading,
  descriptionPreviewHtml,
  isExternalDescription,
  hasExternalDescriptionUrl,
  isExternalDescriptionLoaded,
  externalDescriptionStatus,
  onUpdatePackageField,
  onSetDescriptionTab,
}: RegisterDescriptionSectionProps) {
  const previewMarkup = useMemo(() => ({ __html: descriptionPreviewHtml }), [descriptionPreviewHtml]);

  return (
    <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={isExternalDescription ? 'description-url' : 'description-textarea'}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          詳細説明 <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white text-xs font-medium shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              className={`rounded-l-lg px-3 py-1.5 transition-colors ${
                !isExternalDescription
                  ? 'bg-blue-50 text-blue-700 hover:text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:text-blue-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-slate-100'
              }`}
              onClick={() => onUpdatePackageField('descriptionMode', 'inline')}
            >
              アプリ内入力
            </button>
            <button
              type="button"
              className={`rounded-r-lg px-3 py-1.5 transition-colors ${
                isExternalDescription
                  ? 'bg-blue-50 text-blue-700 hover:text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:text-blue-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:text-slate-100'
              }`}
              onClick={() => onUpdatePackageField('descriptionMode', 'external')}
            >
              外部MDリンク
            </button>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Markdown形式</span>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div
          className="flex border-b border-slate-100 bg-slate-50/50 px-2 pt-2 dark:border-slate-800 dark:bg-slate-900/50"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={descriptionTab === 'edit'}
            className={`flex-1 rounded-tl-lg px-4 py-2 text-sm font-semibold text-center transition-colors ${
              descriptionTab === 'edit'
                ? 'bg-white text-blue-700 hover:text-blue-700 shadow-[0_-1px_2px_rgba(0,0,0,0.05)] dark:bg-slate-800 dark:text-blue-300 dark:hover:text-blue-300'
                : 'bg-slate-50/50 text-slate-600 hover:text-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
            onClick={() => onSetDescriptionTab('edit')}
          >
            {isExternalDescription ? '外部リンク指定' : '編集'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={descriptionTab === 'preview'}
            className={`flex-1 rounded-tr-lg px-4 py-2 text-sm font-semibold text-center transition-colors ${
              descriptionTab === 'preview'
                ? 'bg-white text-blue-700 hover:text-blue-700 shadow-[0_-1px_2px_rgba(0,0,0,0.05)] dark:bg-slate-800 dark:text-blue-300 dark:hover:text-blue-300'
                : 'bg-slate-50/50 text-slate-600 hover:text-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:text-slate-100'
            }`}
            onClick={() => onSetDescriptionTab('preview')}
          >
            プレビュー
          </button>
        </div>
        <div className="p-0">
          {descriptionTab === 'edit' ? (
            isExternalDescription ? (
              <div className="space-y-3 p-4">
                <input
                  id="description-url"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800"
                  type="url"
                  value={packageForm.descriptionUrl}
                  onChange={(e) => onUpdatePackageField('descriptionUrl', e.target.value)}
                  placeholder="https://example.com/description.md"
                />
                {!hasExternalDescriptionUrl && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">MarkdownのURLを入力してください。</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  GitHub上のMDを登録される場合はhttps://raw.githubusercontent.com/から始まるリンクになっているか注意してください。
                </p>
                {descriptionLoading && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">リンク先を読み込み中…</p>
                )}
                {isExternalDescriptionLoaded && !descriptionLoading && (
                  <div className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                    Markdown読み込み済み
                  </div>
                )}
                {hasExternalDescriptionUrl && externalDescriptionStatus === 'error' && !descriptionLoading && (
                  <div className="inline-flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                    <AlertCircle size={14} />
                    Markdownを読み込めませんでした
                  </div>
                )}
              </div>
            ) : (
              <textarea
                id="description-textarea"
                className="min-h-[400px] w-full resize-y border-0 bg-transparent p-4 font-mono text-sm leading-relaxed focus:ring-0"
                value={packageForm.descriptionText}
                onChange={(e) => onUpdatePackageField('descriptionText', e.target.value)}
                required
                placeholder="パッケージの詳細情報を入力してください。Markdown形式で記入できます。どこから呼び出せるか（メニュー位置など）や、UIの説明もあわせて記入していただけると助かります。外部サイトの画像も貼り付けることができます。"
              />
            )
          ) : (
            <div
              className="prose prose-slate max-h-[400px] w-full max-w-none overflow-y-auto p-6 dark:prose-invert"
              dangerouslySetInnerHTML={previewMarkup}
              onClick={async (e) => {
                // プレビュー内リンクはアプリ外ブラウザで開き、SPA 遷移を汚染しない。
                const target = e.target as HTMLElement | null;
                const link = target?.closest('a');
                if (link && link.href) {
                  e.preventDefault();
                  await open(link.href);
                }
              }}
              onKeyDown={async (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const target = e.target as HTMLElement | null;
                const link = target?.closest('a');
                if (link && link.href) {
                  e.preventDefault();
                  await open(link.href);
                }
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
