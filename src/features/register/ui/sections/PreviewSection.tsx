/**
 * プレビューセクションのコンポーネント
 */
import React, { useMemo, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import PackageCard from '../../../../components/package-card/PackageCard';
import type { RegisterPreviewSectionProps } from '../types';

export default function RegisterPreviewSection({
  packageForm,
  currentTags,
  previewDarkMode,
  onTogglePreviewDarkMode,
}: RegisterPreviewSectionProps) {
  const fallbackUpdatedAtRef = useRef(new Date().toISOString());
  const thumbnailPreview = packageForm.images.thumbnail?.previewUrl || '';
  const infoImages = useMemo(
    () => packageForm.images.info.map((entry) => entry.previewUrl).filter(Boolean),
    [packageForm.images.info],
  );
  const updatedAt = useMemo(() => {
    if (packageForm.versions.length > 0) {
      return packageForm.versions[packageForm.versions.length - 1].release_date;
    }
    return fallbackUpdatedAtRef.current;
  }, [packageForm.versions]);
  const previewItem = useMemo(
    () => ({
      id: packageForm.id || 'preview-id',
      name: packageForm.name || 'パッケージ名',
      author: packageForm.author || '作者名',
      type: packageForm.type || '種類',
      tags: currentTags,
      summary: packageForm.summary || '概要がここに表示されます',
      images: [
        {
          thumbnail: thumbnailPreview,
          infoImg: infoImages,
        },
      ],
      updatedAt,
      installed: false,
      isLatest: true,
    }),
    [
      packageForm.id,
      packageForm.name,
      packageForm.author,
      packageForm.type,
      packageForm.summary,
      currentTags,
      thumbnailPreview,
      infoImages,
      updatedAt,
    ],
  );
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">プレビュー</h2>
        <button
          type="button"
          onClick={onTogglePreviewDarkMode}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {previewDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          <span>{previewDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}</span>
        </button>
      </div>
      <div
        className={`overflow-x-auto rounded-xl border border-slate-200 p-8 transition-colors ${
          previewDarkMode ? 'bg-slate-950 border-slate-800 dark' : 'bg-slate-50 light'
        }`}
      >
        <div className="flex justify-center pointer-events-none opacity-90 grayscale-[10%]">
          <div className="w-[500px]">
            <PackageCard item={previewItem} />
          </div>
        </div>
      </div>
    </section>
  );
}
