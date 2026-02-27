/**
 * サムネイル／説明画像のコンポーネント
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as tauriDialog from '@tauri-apps/plugin-dialog';
import * as tauriFs from '@tauri-apps/plugin-fs';
import * as tauriWindow from '@tauri-apps/api/window';
import Button from '@/components/ui/Button';
import { Download, Image, ImagePlus, Images, Trash2 } from 'lucide-react';
import { getFileExtension } from '../../model/form';
import { basename, isInsideRect } from '../../model/helpers';
import type { PackageImagesSectionProps, RegisterSelectedImageInput } from '../types';
import DeleteButton from '../components/DeleteButton';
import { cn } from '@/lib/cn';
import { layout, surface, text } from '@/components/ui/_styles';

type InfoImageCardProps = {
  entryKey: string;
  filename: string;
  preview: string;
  onRemove: (key: string) => void;
};

type DragPayload = {
  paths: string[];
  position: {
    x: number;
    y: number;
  };
};

function parseDragPayload(event: unknown): DragPayload | null {
  if (!event || typeof event !== 'object' || !('payload' in event)) return null;
  const payload = (event as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') return null;
  const pos = (payload as { position?: unknown }).position;
  if (!pos || typeof pos !== 'object') return null;
  const x = (pos as { x?: unknown }).x;
  const y = (pos as { y?: unknown }).y;
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  const rawPaths = (payload as { paths?: unknown }).paths;
  const paths = Array.isArray(rawPaths)
    ? rawPaths.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  return { paths, position: { x, y } };
}

type ImagePreviewLayerProps = {
  preview: string;
  emptyLabel: string;
  style?: CSSProperties;
};

const imageCardClass =
  'group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50';
const imageHoverOverlayClass = 'absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10';
const imagePickerButtonClass = 'relative cursor-pointer';
const bounceIconClass = 'mx-auto mb-2 animate-bounce';
const dragDropActivePanelClass = 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20';
const dragDropInactivePanelClass = 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const dragDropZoneClass =
  'flex items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';

const ImagePreviewLayer = memo(function ImagePreviewLayer({ preview, emptyLabel, style }: ImagePreviewLayerProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center bg-contain bg-center bg-no-repeat text-xs text-transparent',
        !preview && 'text-slate-400',
      )}
      style={style}
    >
      {!preview && <span>{emptyLabel}</span>}
    </div>
  );
});

const InfoImageCard = memo(function InfoImageCard({ entryKey, filename, preview, onRemove }: InfoImageCardProps) {
  const previewStyle = useMemo(() => (preview ? { backgroundImage: `url(${preview})` } : undefined), [preview]);
  const handleRemove = useCallback(() => {
    onRemove(entryKey);
  }, [onRemove, entryKey]);

  return (
    <div className={imageCardClass}>
      <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-900">
        <ImagePreviewLayer preview={preview} emptyLabel="No Preview" style={previewStyle} />
        <div className={imageHoverOverlayClass} />
        <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="floatingDanger"
            size="iconSm"
            radius="full"
            type="button"
            className="shadow-sm backdrop-blur-sm"
            onClick={handleRemove}
            aria-label="削除"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
        <p className={cn('truncate text-[10px]', text.mediumSlate)} title={filename}>
          {filename}
        </p>
      </div>
    </div>
  );
});

const PackageImagesSection = memo(
  function PackageImagesSection({
    images,
    packageId,
    onThumbnailChange,
    onRemoveThumbnail,
    onAddInfoImages,
    onRemoveInfoImage,
  }: PackageImagesSectionProps) {
    const thumbnailRef = useRef<HTMLDivElement | null>(null);
    const infoRef = useRef<HTMLDivElement | null>(null);
    const [isDraggingOverThumbnail, setIsDraggingOverThumbnail] = useState(false);
    const [isDraggingOverInfo, setIsDraggingOverInfo] = useState(false);

    const loadFilesFromPaths = useCallback(async (paths: string[]): Promise<RegisterSelectedImageInput[]> => {
      const files: RegisterSelectedImageInput[] = [];
      for (const p of paths) {
        try {
          const bytes = await tauriFs.readFile(p);
          const name = basename(p);
          const ext = getFileExtension(name) || 'bin';
          let type = 'application/octet-stream';
          if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
            type = ext === 'jpg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
          }
          const file = new File([bytes], name, { type });
          files.push({ file, sourcePath: p });
        } catch (err) {
          console.error(`Failed to read dropped file: ${p}`, err);
        }
      }
      return files;
    }, []);

    const openImageDialog = useCallback(
      async (multiple: boolean): Promise<RegisterSelectedImageInput[]> => {
        try {
          const selection = await tauriDialog.open({
            title: multiple ? '説明画像を選択' : 'サムネイル画像を選択',
            multiple,
            filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }],
          });
          const rawPaths = Array.isArray(selection) ? selection : selection ? [selection] : [];
          const paths = rawPaths.filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0,
          );
          if (paths.length === 0) return [];
          return loadFilesFromPaths(paths);
        } catch (err) {
          console.error('Failed to open image picker', err);
          return [];
        }
      },
      [loadFilesFromPaths],
    );

    useEffect(() => {
      let unlistenDragDrop: (() => void) | null = null;
      let unlistenDragEnter: (() => void) | null = null;
      let unlistenDragOver: (() => void) | null = null;
      let unlistenDragLeave: (() => void) | null = null;

      const setupDragDrop = async () => {
        try {
          const appWindow = tauriWindow.getCurrentWindow();
          let scaleFactor = 1;
          try {
            scaleFactor = await appWindow.scaleFactor();
          } catch {
            scaleFactor = 1;
          }
          const handleDragEvent = async (event: unknown, type: 'drop' | 'enter' | 'over' | 'leave') => {
            const payload = parseDragPayload(event);
            if (!payload) return;
            const { position } = payload;
            const thumbRect = thumbnailRef.current?.getBoundingClientRect() ?? null;
            const infoRect = infoRef.current?.getBoundingClientRect() ?? null;

            const clientX = position.x / scaleFactor;
            const clientY = position.y / scaleFactor;
            const overThumbnail = isInsideRect(thumbRect, clientX, clientY);
            const overInfo = isInsideRect(infoRect, clientX, clientY);

            if (type === 'drop') {
              const { paths } = payload;
              if (overThumbnail && paths.length > 0) {
                const files = await loadFilesFromPaths([paths[0]]);
                if (files.length > 0) onThumbnailChange(files[0]);
              } else if (overInfo && paths.length > 0) {
                const files = await loadFilesFromPaths(paths);
                if (files.length > 0) onAddInfoImages(files);
              }
              setIsDraggingOverThumbnail(false);
              setIsDraggingOverInfo(false);
            } else if (type === 'enter' || type === 'over') {
              setIsDraggingOverThumbnail(overThumbnail);
              setIsDraggingOverInfo(overInfo);
            } else {
              setIsDraggingOverThumbnail(false);
              setIsDraggingOverInfo(false);
            }
          };

          unlistenDragDrop = await appWindow.listen('tauri://drag-drop', (e) => {
            void handleDragEvent(e, 'drop');
          });
          unlistenDragEnter = await appWindow.listen('tauri://drag-enter', (e) => {
            void handleDragEvent(e, 'enter');
          });
          unlistenDragOver = await appWindow.listen('tauri://drag-over', (e) => {
            void handleDragEvent(e, 'over');
          });
          unlistenDragLeave = await appWindow.listen('tauri://drag-leave', (e) => {
            void handleDragEvent(e, 'leave');
          });
        } catch (err) {
          console.error('Failed to setup drag and drop listeners', err);
        }
      };

      setupDragDrop();

      return () => {
        if (unlistenDragDrop) unlistenDragDrop();
        if (unlistenDragEnter) unlistenDragEnter();
        if (unlistenDragOver) unlistenDragOver();
        if (unlistenDragLeave) unlistenDragLeave();
      };
    }, [loadFilesFromPaths, onThumbnailChange, onAddInfoImages]);

    const thumbnailPreview = images.thumbnail?.previewUrl || images.thumbnail?.existingPath || '';
    const thumbnailPreviewStyle = useMemo(
      () => (thumbnailPreview ? { backgroundImage: `url(${thumbnailPreview})` } : undefined),
      [thumbnailPreview],
    );
    return (
      <section className={surface.cardSectionStack}>
        <div className={layout.rowBetweenWrapGap2}>
          <h2 className={text.titleLg}>画像</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div
            ref={thumbnailRef}
            className={cn(
              'space-y-3 rounded-xl border p-5 shadow-sm transition-colors',
              isDraggingOverThumbnail ? dragDropActivePanelClass : dragDropInactivePanelClass,
            )}
          >
            <div className={layout.rowBetweenWrapGap3}>
              <div>
                <h3 className={text.imageHeader}>サムネイル</h3>
                <p className={text.mutedXs}>パッケージ一覧に表示します (1枚)</p>
                <p className="text-[11px] text-blue-500 dark:text-blue-400">
                  ※推奨：縦横比1:1 (206×206px前後)
                  <br />
                  一覧を見やすくするため、可能であればご登録ください
                </p>
              </div>
              <Button
                variant="muted"
                size="xs"
                type="button"
                className={imagePickerButtonClass}
                onClick={async () => {
                  const files = await openImageDialog(false);
                  if (files[0]) onThumbnailChange(files[0]);
                }}
              >
                <ImagePlus size={16} />
                <span>画像を選択</span>
              </Button>
            </div>
            {isDraggingOverThumbnail ? (
              <div className={cn(dragDropZoneClass, 'h-52')}>
                <div className="text-center">
                  <Download size={32} className={bounceIconClass} />
                  <span className="text-sm font-bold">ここにドロップして追加</span>
                </div>
              </div>
            ) : images.thumbnail ? (
              <div className={imageCardClass}>
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-900">
                  <ImagePreviewLayer
                    preview={thumbnailPreview}
                    emptyLabel="プレビューなし"
                    style={thumbnailPreviewStyle}
                  />
                  <div className={imageHoverOverlayClass} />
                </div>
                <div
                  className={cn(
                    layout.rowBetweenGap2,
                    'border-t border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900',
                  )}
                >
                  <span
                    className={text.truncateLabelXs}
                    title={images.thumbnail.file?.name || images.thumbnail.sourcePath || images.thumbnail.existingPath}
                  >
                    {images.thumbnail.file?.name ||
                      images.thumbnail.sourcePath ||
                      images.thumbnail.existingPath ||
                      '未設定'}
                  </span>
                  <DeleteButton onClick={onRemoveThumbnail} ariaLabel="サムネイルを削除" />
                </div>
              </div>
            ) : (
              <div className={cn(surface.dashedPlaceholder, 'h-52 dark:border-slate-700 dark:bg-slate-900/50')}>
                <Image size={32} className="mb-2 opacity-50" />
                <span className="text-xs font-medium">サムネイルが未設定です</span>
                <span className={text.tinyMutedMt1}>画像をドラッグ＆ドロップ</span>
              </div>
            )}
          </div>

          <div
            ref={infoRef}
            className={cn(
              'flex flex-col space-y-3 rounded-xl border p-5 shadow-sm transition-colors lg:col-span-2',
              isDraggingOverInfo ? dragDropActivePanelClass : dragDropInactivePanelClass,
            )}
          >
            <div className={layout.rowBetweenWrapGap3}>
              <div>
                <h3 className={text.imageHeader}>説明画像</h3>
                <p className={text.mutedXs}>パッケージ詳細ページに表示する説明画像 (複数可)</p>
                <p className="text-[10px] text-blue-500 dark:text-blue-400">※縦横比は16:9を推奨します</p>
              </div>
              <Button
                variant="muted"
                size="xs"
                type="button"
                className={imagePickerButtonClass}
                onClick={async () => {
                  const files = await openImageDialog(true);
                  if (files.length > 0) onAddInfoImages(files);
                }}
              >
                <Images size={16} />
                <span>画像を追加</span>
              </Button>
            </div>
            {isDraggingOverInfo ? (
              <div className={cn(dragDropZoneClass, 'flex-1 min-h-[13rem]')}>
                <div className="text-center">
                  <Download size={32} className={bounceIconClass} />
                  <span className="text-sm font-bold">ここにドロップして追加</span>
                </div>
              </div>
            ) : images.info.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {images.info.map((entry, idx) => {
                  const preview = entry.previewUrl || entry.existingPath || '';
                  const filename =
                    entry.file?.name ||
                    entry.sourcePath ||
                    entry.existingPath ||
                    `./image/${packageId}_${idx + 1}.(拡張子)`;
                  return (
                    <InfoImageCard
                      key={entry.key}
                      entryKey={entry.key}
                      filename={filename}
                      preview={preview}
                      onRemove={onRemoveInfoImage}
                    />
                  );
                })}
              </div>
            ) : (
              <div
                className={cn(
                  surface.dashedPlaceholder,
                  'min-h-[13rem] flex-1 dark:border-slate-700 dark:bg-slate-900/50',
                )}
              >
                <Image size={32} className="mb-2 opacity-50" />
                <span className="text-xs font-medium">説明画像が未設定です</span>
                <span className={text.tinyMutedMt1}>画像をドラッグ＆ドロップ</span>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  },
  (prev: Readonly<PackageImagesSectionProps>, next: Readonly<PackageImagesSectionProps>) =>
    prev.images === next.images &&
    prev.packageId === next.packageId &&
    prev.onThumbnailChange === next.onThumbnailChange &&
    prev.onRemoveThumbnail === next.onRemoveThumbnail &&
    prev.onAddInfoImages === next.onAddInfoImages &&
    prev.onRemoveInfoImage === next.onRemoveInfoImage,
);

export default PackageImagesSection;
