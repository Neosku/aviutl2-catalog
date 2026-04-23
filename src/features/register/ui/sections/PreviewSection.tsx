/**
 * プレビューセクションのコンポーネント
 */
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import { Moon, Sun } from 'lucide-react';
import PackageCard from '@/components/package-card/PackageCard';
import type { RegisterPreviewSectionProps } from '../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function RegisterPreviewSection({
  packageForm,
  currentTags,
  previewDarkMode,
  onTogglePreviewDarkMode,
}: RegisterPreviewSectionProps) {
  const { t } = useTranslation(['register', 'common']);
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
      name: packageForm.name || t('preview.fallbackName'),
      author: packageForm.author || t('preview.fallbackAuthor'),
      packageType: packageForm.type || t('common:labels.type'),
      type: packageForm.type || t('common:labels.type'),
      tags: currentTags,
      summary: packageForm.summary || t('preview.fallbackSummary'),
      deprecation: packageForm.deprecationEnabled
        ? { message: String(packageForm.deprecationMessage || '').trim() }
        : undefined,
      images: [
        {
          thumbnail: thumbnailPreview,
          infoImg: infoImages,
        },
      ],
      updatedAt: new Date(updatedAt).getTime() || null,
      installed: false,
      isLatest: true,
    }),
    [
      packageForm.id,
      packageForm.name,
      packageForm.author,
      packageForm.type,
      packageForm.summary,
      packageForm.deprecationEnabled,
      packageForm.deprecationMessage,
      currentTags,
      thumbnailPreview,
      infoImages,
      updatedAt,
    ],
  );
  return (
    <section className={surface.cardSection}>
      <div className={layout.rowBetweenGap2}>
        <h2 className={text.titleLg}>{t('preview.title')}</h2>
        <Button variant="muted" size="compact" type="button" onClick={onTogglePreviewDarkMode} className="font-medium">
          {previewDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          <span>{previewDarkMode ? t('preview.switchToLight') : t('preview.switchToDark')}</span>
        </Button>
      </div>
      <div
        className={cn(
          'overflow-x-auto p-8 transition-colors',
          surface.panel,
          previewDarkMode
            ? 'bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark'
            : 'bg-slate-50 border-slate-200 light',
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
