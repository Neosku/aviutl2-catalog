import React from 'react';
import type { LicenseModalProps } from '../types';

export default function LicenseModal({ license, onClose }: LicenseModalProps) {
  if (!license) return null;
  const body = license.body;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
    >
      <button type="button" aria-label="閉じる" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h3 id="license-modal-title" className="text-lg font-bold">
            ライセンス: {license.type || '不明'}
          </h3>
        </div>
        <div className="px-6 py-4">
          {body ? (
            <pre className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
              {body}
            </pre>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">ライセンス本文がありません。</div>
          )}
        </div>
        <div className="flex justify-end border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
