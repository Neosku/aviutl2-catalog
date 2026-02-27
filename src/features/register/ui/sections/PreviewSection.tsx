/**
 * プレビューセクションのコンポーネント
 */
import React, { useMemo, useRef } from 'react';
import Button from '@/components/ui/Button';
import { Moon, Sun } from 'lucide-react';
import PackageCard from '../../../../components/package-card/PackageCard';
import type { RegisterPreviewSectionProps } from '../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

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
    <section className={surface.cardSectionStack}>
      <div className={layout.rowBetweenGap2}>
        <h2 className={text.titleLg}>プレビュー</h2>
        <Button variant="muted" size="compact" type="button" onClick={onTogglePreviewDarkMode} className="font-medium">
          {previewDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          <span>{previewDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}</span>
        </Button>
      </div>
      <div
        className={cn(
          'overflow-x-auto p-8 transition-colors',
          surface.panel,
          previewDarkMode ? 'bg-slate-950 border-slate-800 dark' : 'bg-slate-50 light',
        )}
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
