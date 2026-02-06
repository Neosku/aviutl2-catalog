/**
 * サムネイル／説明画像のコンポーネント
 */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { readFile } from '@tauri-apps/plugin-fs';
import { Download, Image, ImagePlus, Images, Trash2 } from 'lucide-react';
import { getFileExtension } from '../../model/form';
import { basename, isInsideRect } from '../../model/helpers';
import type { PackageImagesSectionProps } from '../types';
import DeleteButton from '../components/DeleteButton';

type InfoImageCardProps = {
  entryKey: string;
  filename: string;
  preview: string;
  onRemove: (key: string) => void;
};

const InfoImageCard = memo(function InfoImageCard({ entryKey, filename, preview, onRemove }: InfoImageCardProps) {
  const previewStyle = useMemo(() => (preview ? { backgroundImage: `url(${preview})` } : undefined), [preview]);
  const handleRemove = useCallback(() => {
    onRemove(entryKey);
  }, [onRemove, entryKey]);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-900">
        <div
          className={`absolute inset-0 flex items-center justify-center bg-contain bg-center bg-no-repeat text-xs text-transparent ${preview ? '' : 'text-slate-400'}`}
          style={previewStyle}
        >
          {!preview && <span>No Preview</span>}
        </div>
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
        <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm backdrop-blur-sm transition hover:bg-red-50 hover:text-red-700 dark:bg-slate-900/90 dark:text-red-400 dark:hover:bg-red-900/40"
            onClick={handleRemove}
            aria-label="削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
        <p className="truncate text-[10px] font-medium text-slate-700 dark:text-slate-300" title={filename}>
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

    useEffect(() => {
      let unlistenDragDrop: (() => void) | null = null;
      let unlistenDragEnter: (() => void) | null = null;
      let unlistenDragOver: (() => void) | null = null;
      let unlistenDragLeave: (() => void) | null = null;

      const setupDragDrop = async () => {
        try {
          const appWindow = getCurrentWindow();
          let scaleFactor = 1;
          try {
            scaleFactor = await appWindow.scaleFactor();
          } catch {
            scaleFactor = 1;
          }
          const processDroppedFiles = async (paths: string[]) => {
            const files: File[] = [];
            for (const p of paths) {
              try {
                const bytes = await readFile(p);
                const name = basename(p);
                const ext = getFileExtension(name) || 'bin';
                let type = 'application/octet-stream';
                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) type = `image/${ext}`;

                const file = new File([bytes], name, { type });
                files.push(file);
              } catch (err) {
                console.error(`Failed to read dropped file: ${p}`, err);
              }
            }
            return files;
          };

          const handleDragEvent = async (event: any, type: 'drop' | 'enter' | 'over' | 'leave') => {
            const { position } = event.payload;
            const thumbRect = thumbnailRef.current?.getBoundingClientRect() ?? null;
            const infoRect = infoRef.current?.getBoundingClientRect() ?? null;

            const clientX = position.x / scaleFactor;
            const clientY = position.y / scaleFactor;
            const overThumbnail = isInsideRect(thumbRect, clientX, clientY);
            const overInfo = isInsideRect(infoRect, clientX, clientY);

            if (type === 'drop') {
              const { paths } = event.payload;
              if (overThumbnail && paths.length > 0) {
                const files = await processDroppedFiles([paths[0]]);
                if (files.length > 0) onThumbnailChange(files[0]);
              } else if (overInfo && paths.length > 0) {
                const files = await processDroppedFiles(paths);
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
    }, [onThumbnailChange, onAddInfoImages]);

    const thumbnailPreview = images.thumbnail?.previewUrl || images.thumbnail?.existingPath || '';
    const thumbnailPreviewStyle = useMemo(
      () => (thumbnailPreview ? { backgroundImage: `url(${thumbnailPreview})` } : undefined),
      [thumbnailPreview],
    );
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">画像</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div
            ref={thumbnailRef}
            className={`space-y-3 rounded-xl border p-5 shadow-sm transition-colors ${
              isDraggingOverThumbnail
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">サムネイル</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">パッケージ一覧に表示します (1枚)</p>
                <p className="text-[11px] text-blue-500 dark:text-blue-400">
                  ※推奨：縦横比1:1 (206×206px前後)
                  <br />
                  一覧を見やすくするため、可能であればご登録ください
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                <ImagePlus size={16} />
                <span>画像を選択</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onThumbnailChange(file);
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
              </label>
            </div>
            {isDraggingOverThumbnail ? (
              <div className="flex h-52 items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <div className="text-center">
                  <Download size={32} className="mx-auto mb-2 animate-bounce" />
                  <span className="text-sm font-bold">ここにドロップして追加</span>
                </div>
              </div>
            ) : images.thumbnail ? (
              <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-900">
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-contain bg-center bg-no-repeat text-xs text-transparent ${thumbnailPreview ? '' : 'text-slate-400'}`}
                    style={thumbnailPreviewStyle}
                  >
                    {!thumbnailPreview && <span>プレビューなし</span>}
                  </div>
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                  <span
                    className="truncate text-xs font-medium text-slate-700 dark:text-slate-300"
                    title={images.thumbnail.file?.name || images.thumbnail.existingPath}
                  >
                    {images.thumbnail.file?.name || images.thumbnail.existingPath || '未設定'}
                  </span>
                  <DeleteButton onClick={onRemoveThumbnail} ariaLabel="サムネイルを削除" />
                </div>
              </div>
            ) : (
              <div className="flex h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/50">
                <Image size={32} className="mb-2 opacity-50" />
                <span className="text-xs font-medium">サムネイルが未設定です</span>
                <span className="text-[10px] opacity-70 mt-1">画像をドラッグ＆ドロップ</span>
              </div>
            )}
          </div>

          <div
            ref={infoRef}
            className={`flex flex-col space-y-3 rounded-xl border p-5 shadow-sm transition-colors lg:col-span-2 ${
              isDraggingOverInfo
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">説明画像</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  パッケージ詳細ページに表示する説明画像 (複数可)
                </p>
                <p className="text-[10px] text-blue-500 dark:text-blue-400">※縦横比は16:9を推奨します</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                <Images size={16} />
                <span>画像を追加</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) onAddInfoImages(files);
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
              </label>
            </div>
            {isDraggingOverInfo ? (
              <div className="flex flex-1 min-h-[13rem] items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <div className="text-center">
                  <Download size={32} className="mx-auto mb-2 animate-bounce" />
                  <span className="text-sm font-bold">ここにドロップして追加</span>
                </div>
              </div>
            ) : images.info.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {images.info.map((entry, idx) => {
                  const preview = entry.previewUrl || entry.existingPath || '';
                  const filename = entry.file?.name || entry.existingPath || `./image/${packageId}_${idx + 1}.(拡張子)`;
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
              <div className="flex flex-1 min-h-[13rem] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/50">
                <Image size={32} className="mb-2 opacity-50" />
                <span className="text-xs font-medium">説明画像が未設定です</span>
                <span className="text-[10px] opacity-70 mt-1">画像をドラッグ＆ドロップ</span>
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
