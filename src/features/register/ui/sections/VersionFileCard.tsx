/**
 * バージョン配下のファイルカードコンポーネント
 * ハッシュ計算やパス入力を行う
 */
import React, { memo } from 'react';
import { FileSearch } from 'lucide-react';
import type { VersionFileCardProps } from '../types';
import DeleteButton from '../components/DeleteButton';
const VersionFileCard = memo(
  function VersionFileCard({
    versionKey,
    file,
    index,
    removeVersionFile,
    updateVersionFile,
    chooseFileForHash,
  }: VersionFileCardProps) {
    const order = index + 1;
    return (
      <div className="group relative space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            File {order}
          </span>
          <DeleteButton onClick={() => removeVersionFile(versionKey, file.key)} ariaLabel={`ファイル${order}を削除`} />
        </div>
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
            htmlFor={`version-${versionKey}-file-${file.key}-path`}
          >
            保存先パス (インストール時)
          </label>
          <input
            id={`version-${versionKey}-file-${file.key}-path`}
            value={file.path}
            onChange={(e) => updateVersionFile(versionKey, file.key, 'path', e.target.value)}
            placeholder="{pluginsDir}/plugin.dll"
            className="!bg-white dark:!bg-slate-800"
          />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <dl className="grid gap-1 text-xs">
              <div>
                <dt className="font-semibold text-slate-500 dark:text-slate-400">ハッシュ値 (XXH3_128)</dt>
                <dd
                  className={`font-mono ${file.hash ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-500'}`}
                >
                  {file.hash ? file.hash : '未計算'}
                </dd>
              </div>
              {file.fileName && (
                <div className="mt-1">
                  <dt className="font-semibold text-slate-500 dark:text-slate-400">元ファイル名</dt>
                  <dd className="text-slate-600 dark:text-slate-300">{file.fileName}</dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              onClick={() => chooseFileForHash(versionKey, file.key)}
            >
              <FileSearch size={14} />
              <span>ファイルを選択して計算</span>
            </button>
          </div>
        </div>
      </div>
    );
  },
  (prev: Readonly<VersionFileCardProps>, next: Readonly<VersionFileCardProps>) =>
    prev.file === next.file &&
    prev.index === next.index &&
    prev.versionKey === next.versionKey &&
    prev.removeVersionFile === next.removeVersionFile &&
    prev.updateVersionFile === next.updateVersionFile &&
    prev.chooseFileForHash === next.chooseFileForHash,
);

export default VersionFileCard;
