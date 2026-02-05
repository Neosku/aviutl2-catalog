/**
 * バージョン編集と画像更新のハンドラー群を提供する hook
 */
import { useCallback } from 'react';
import { computeHashFromFile, createEmptyVersion, createEmptyVersionFile } from '../../model/form';
import { basename, generateKey, revokePreviewUrl } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import type { RefCell } from '../types';

interface UseRegisterVersionImageHandlersArgs {
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  setExpandedVersionKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  versionDateRefs: RefCell<Map<string, HTMLInputElement>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}

export default function useRegisterVersionImageHandlers({
  setPackageForm,
  setExpandedVersionKeys,
  versionDateRefs,
  setError,
}: UseRegisterVersionImageHandlersArgs) {
  const toggleVersionOpen = useCallback(
    (key: string, open: boolean) => {
      setExpandedVersionKeys((prev) => {
        const next = new Set(prev);
        if (open) {
          if (next.has(key)) return prev;
          next.add(key);
        } else {
          if (!next.has(key)) return prev;
          next.delete(key);
        }
        return next;
      });
    },
    [setExpandedVersionKeys],
  );

  const addVersion = useCallback(() => {
    const version = createEmptyVersion();
    setPackageForm((prev) => {
      const lastVer = prev.versions[prev.versions.length - 1];
      if (lastVer && Array.isArray(lastVer.files)) {
        // 直前バージョンの path を複製し、更新時の入力コストを下げる。
        version.files = lastVer.files.map((f) => ({
          ...createEmptyVersionFile(),
          path: f.path || '',
        }));
      }
      return { ...prev, versions: [...prev.versions, version] };
    });
    setExpandedVersionKeys((prev) => {
      const next = new Set(prev);
      next.add(version.key);
      return next;
    });
  }, [setExpandedVersionKeys, setPackageForm]);

  const updateVersionField = useCallback(
    (key: string, field: string, value: string) => {
      setPackageForm((prev) => ({
        ...prev,
        versions: prev.versions.map((ver) => (ver.key === key ? { ...ver, [field]: value } : ver)),
      }));
    },
    [setPackageForm],
  );

  const removeVersion = useCallback(
    (key: string) => {
      setPackageForm((prev) => ({ ...prev, versions: prev.versions.filter((ver) => ver.key !== key) }));
    },
    [setPackageForm],
  );

  const addVersionFile = useCallback(
    (versionKey: string) => {
      setPackageForm((prev) => ({
        ...prev,
        versions: prev.versions.map((ver) =>
          ver.key === versionKey ? { ...ver, files: [...ver.files, createEmptyVersionFile()] } : ver,
        ),
      }));
    },
    [setPackageForm],
  );

  const updateVersionFile = useCallback(
    (versionKey: string, fileKey: string, field: string, value: string) => {
      setPackageForm((prev) => ({
        ...prev,
        versions: prev.versions.map((ver) =>
          ver.key === versionKey
            ? {
                ...ver,
                files: ver.files.map((file) => (file.key === fileKey ? { ...file, [field]: value } : file)),
              }
            : ver,
        ),
      }));
    },
    [setPackageForm],
  );

  const removeVersionFile = useCallback(
    (versionKey: string, fileKey: string) => {
      setPackageForm((prev) => ({
        ...prev,
        versions: prev.versions.map((ver) =>
          ver.key === versionKey ? { ...ver, files: ver.files.filter((file) => file.key !== fileKey) } : ver,
        ),
      }));
    },
    [setPackageForm],
  );

  const chooseFileForHash = useCallback(
    async (versionKey: string, fileKey: string) => {
      try {
        setError('');
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selection = await open({
          multiple: false,
          title: 'XXH3_128 を計算するファイルを選択',
        });
        const selectedPath = Array.isArray(selection) ? selection[0] : selection;
        if (!selectedPath || typeof selectedPath !== 'string') return;
        // 実ファイルからハッシュを再計算し、手入力ミスを防ぐ。
        const hash = await computeHashFromFile(selectedPath);
        updateVersionFile(versionKey, fileKey, 'hash', hash);
        updateVersionFile(versionKey, fileKey, 'fileName', basename(selectedPath));
      } catch (err) {
        console.error(err);
        const rawMessage = err instanceof Error ? err.message : 'XXH3_128 の計算に失敗しました';
        const friendly =
          typeof rawMessage === 'string' && /module/i.test(rawMessage)
            ? 'ファイル選択機能を利用できません。Tauri 環境で実行してください。'
            : rawMessage;
        setError(friendly);
      }
    },
    [setError, updateVersionFile],
  );

  const handleThumbnailChange = useCallback(
    (file: File) => {
      setPackageForm((prev) => {
        const nextImages = { ...prev.images };
        if (nextImages.thumbnail?.previewUrl) revokePreviewUrl(nextImages.thumbnail.previewUrl);
        nextImages.thumbnail = file
          ? { file, existingPath: '', previewUrl: URL.createObjectURL(file), key: generateKey() }
          : null;
        return { ...prev, images: nextImages };
      });
    },
    [setPackageForm],
  );

  const handleRemoveThumbnail = useCallback(() => {
    setPackageForm((prev) => {
      const nextImages = { ...prev.images };
      if (nextImages.thumbnail?.previewUrl) revokePreviewUrl(nextImages.thumbnail.previewUrl);
      nextImages.thumbnail = null;
      return { ...prev, images: nextImages };
    });
  }, [setPackageForm]);

  const handleAddInfoImages = useCallback(
    (files: FileList | File[]) => {
      if (!files || !files.length) return;
      setPackageForm((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          info: [
            ...prev.images.info,
            ...Array.from(files).map((file) => ({
              file,
              existingPath: '',
              previewUrl: URL.createObjectURL(file),
              key: generateKey(),
            })),
          ],
        },
      }));
    },
    [setPackageForm],
  );

  const handleRemoveInfoImage = useCallback(
    (key: string) => {
      setPackageForm((prev) => {
        const nextImages = { ...prev.images };
        const target = nextImages.info.find((entry) => entry.key === key);
        if (target?.previewUrl) revokePreviewUrl(target.previewUrl);
        nextImages.info = nextImages.info.filter((entry) => entry.key !== key);
        return { ...prev, images: nextImages };
      });
    },
    [setPackageForm],
  );

  const openDatePicker = useCallback(
    (key: string) => {
      const input = versionDateRefs.current.get(key);
      if (!input) return;
      // picker 呼び出し時の自動スクロールで編集位置が飛ばないように復元する。
      const previousScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }
      if (input.showPicker) {
        try {
          input.showPicker();
        } catch {
          input.click();
        }
      } else {
        input.click();
      }
      if (typeof window !== 'undefined') {
        window.scrollTo(0, previousScrollY);
      }
    },
    [versionDateRefs],
  );

  return {
    toggleVersionOpen,
    addVersion,
    updateVersionField,
    removeVersion,
    addVersionFile,
    updateVersionFile,
    removeVersionFile,
    chooseFileForHash,
    handleThumbnailChange,
    handleRemoveThumbnail,
    handleAddInfoImages,
    handleRemoveInfoImage,
    openDatePicker,
  };
}
