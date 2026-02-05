/**
 * パッケージ基本情報登録セクションのコンポーネント
 */
import React from 'react';
import { Info } from 'lucide-react';
import type { RegisterMetaSectionProps } from '../types';
import TagEditor from './TagEditor';

export default function RegisterMetaSection({
  packageForm,
  initialTags,
  tagCandidates,
  onUpdatePackageField,
  onTagsChange,
}: RegisterMetaSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300">
        <Info size={20} className="mt-0.5 flex-shrink-0 text-blue-500" />
        <div>
          このフォームに入力するプラグイン情報はすべて公開されます。
          <br />
          パッケージ登録は作者本人でなくてもどなたでも行えます。
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="package-id">
              ID <span className="text-red-500">*</span>
            </label>
            <input
              id="package-id"
              name="id"
              value={packageForm.id}
              onChange={(e) => onUpdatePackageField('id', e.target.value)}
              required
              placeholder="Kenkun.AviUtlExEdit2"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">英数字と記号 ( . - _ ) のみ</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="package-name">
              パッケージ名 <span className="text-red-500">*</span>
            </label>
            <input
              id="package-name"
              name="name"
              value={packageForm.name}
              onChange={(e) => onUpdatePackageField('name', e.target.value)}
              required
              placeholder="AviUtl2"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="package-author">
              作者名 <span className="text-red-500">*</span>
            </label>
            <input
              id="package-author"
              name="author"
              value={packageForm.author}
              onChange={(e) => onUpdatePackageField('author', e.target.value)}
              required
              placeholder="KENくん"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="package-original-author">
              オリジナル作者名 (任意)
            </label>
            <input
              id="package-original-author"
              name="originalAuthor"
              value={packageForm.originalAuthor}
              onChange={(e) => onUpdatePackageField('originalAuthor', e.target.value)}
              placeholder="オリジナル版がある場合に入力"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="package-type">
              種類 <span className="text-red-500">*</span>
            </label>
            <input
              id="package-type"
              name="type"
              value={packageForm.type}
              onChange={(e) => onUpdatePackageField('type', e.target.value)}
              required
              placeholder="入力/出力/汎用プラグイン, スクリプト, 言語ファイル"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="package-repo-url">
              パッケージのサイト <span className="text-red-500">*</span>
            </label>
            <input
              id="package-repo-url"
              name="repoURL"
              value={packageForm.repoURL}
              onChange={(e) => onUpdatePackageField('repoURL', e.target.value)}
              placeholder="パッケージのことが分かるURL"
              type="url"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
              htmlFor="package-niconi-commons-id"
            >
              ニコニ・コモンズID (任意)
            </label>
            <input
              id="package-niconi-commons-id"
              name="niconiCommonsId"
              value={packageForm.niconiCommonsId}
              onChange={(e) => onUpdatePackageField('niconiCommonsId', e.target.value)}
              placeholder=""
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="package-dependencies">
            依存パッケージ (現在非対応)
          </label>
          <input
            id="package-dependencies"
            name="dependencies"
            value={packageForm.dependenciesText}
            onChange={(e) => onUpdatePackageField('dependenciesText', e.target.value)}
            placeholder="パッケージID (カンマ区切り)"
          />
        </div>

        <TagEditor initialTags={initialTags} suggestions={tagCandidates} onChange={onTagsChange} />

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="package-summary">
            概要 <span className="text-red-500">*</span>
          </label>
          <input
            id="package-summary"
            name="summary"
            value={packageForm.summary}
            maxLength={35}
            onChange={(e) => onUpdatePackageField('summary', e.target.value)}
            required
            placeholder="パッケージの概要 (35文字以内)"
          />
          <div className="flex justify-end">
            <span
              className={`text-xs ${packageForm.summary.length > 35 ? 'text-red-500 font-bold' : 'text-slate-400'}`}
            >
              {packageForm.summary.length} / 35
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
