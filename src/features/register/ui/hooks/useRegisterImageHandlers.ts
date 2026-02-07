/**
 * 画像編集関連のハンドラー群を提供する hook
 */
import { useCallback } from 'react';
import { generateKey, revokePreviewUrl } from '../../model/helpers';
import type { RegisterPackageForm } from '../../model/types';
import type { RegisterSelectedImageInput } from '../types';

interface UseRegisterImageHandlersArgs {
  setPackageForm: React.Dispatch<React.SetStateAction<RegisterPackageForm>>;
  onUserEdit?: () => void;
}

export default function useRegisterImageHandlers({ setPackageForm, onUserEdit }: UseRegisterImageHandlersArgs) {
  const notifyUserEdit = useCallback(() => {
    onUserEdit?.();
  }, [onUserEdit]);

  const handleThumbnailChange = useCallback(
    ({ file, sourcePath = '' }: RegisterSelectedImageInput) => {
      notifyUserEdit();
      setPackageForm((prev) => {
        const nextImages = { ...prev.images };
        if (nextImages.thumbnail?.previewUrl) revokePreviewUrl(nextImages.thumbnail.previewUrl);
        nextImages.thumbnail = file
          ? {
              file,
              sourcePath: String(sourcePath || ''),
              existingPath: '',
              previewUrl: URL.createObjectURL(file),
              key: generateKey(),
            }
          : null;
        return { ...prev, images: nextImages };
      });
    },
    [notifyUserEdit, setPackageForm],
  );

  const handleRemoveThumbnail = useCallback(() => {
    notifyUserEdit();
    setPackageForm((prev) => {
      const nextImages = { ...prev.images };
      if (nextImages.thumbnail?.previewUrl) revokePreviewUrl(nextImages.thumbnail.previewUrl);
      nextImages.thumbnail = null;
      return { ...prev, images: nextImages };
    });
  }, [notifyUserEdit, setPackageForm]);

  const handleAddInfoImages = useCallback(
    (files: RegisterSelectedImageInput[]) => {
      if (!Array.isArray(files) || files.length === 0) return;
      notifyUserEdit();
      setPackageForm((prev) => ({
        ...prev,
        images: {
          ...prev.images,
          info: [
            ...prev.images.info,
            ...files.map((entry) => ({
              file: entry.file,
              sourcePath: String(entry.sourcePath || ''),
              existingPath: '',
              previewUrl: URL.createObjectURL(entry.file),
              key: generateKey(),
            })),
          ],
        },
      }));
    },
    [notifyUserEdit, setPackageForm],
  );

  const handleRemoveInfoImage = useCallback(
    (key: string) => {
      notifyUserEdit();
      setPackageForm((prev) => {
        const nextImages = { ...prev.images };
        const target = nextImages.info.find((entry) => entry.key === key);
        if (target?.previewUrl) revokePreviewUrl(target.previewUrl);
        nextImages.info = nextImages.info.filter((entry) => entry.key !== key);
        return { ...prev, images: nextImages };
      });
    },
    [notifyUserEdit, setPackageForm],
  );

  return {
    handleThumbnailChange,
    handleRemoveThumbnail,
    handleAddInfoImages,
    handleRemoveInfoImage,
  };
}
