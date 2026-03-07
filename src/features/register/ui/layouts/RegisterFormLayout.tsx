/**
 * 登録画面全体のレイアウトコンポーネント
 */
import { AlertCircle } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import {
  PackageImagesSection,
  PackageInstallerSection,
  PackageLicenseSection,
  PackageVersionSection,
  RegisterDescriptionSection,
  RegisterMetaSection,
  RegisterPreviewSection,
  RegisterSidebar,
  RegisterSubmitBar,
  RegisterTestSection,
} from '../sections';
import type { RegisterFormLayoutProps } from '../types';
import { layout } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function RegisterFormLayout({
  error,
  onSubmit,
  sidebar,
  meta,
  description,
  license,
  images,
  installer,
  versions,
  preview,
  tests,
  submitBar,
}: RegisterFormLayoutProps) {
  return (
    <main className="space-y-8">
      {error && (
        <Alert
          variant="danger"
          className={cn(
            layout.inlineStartGap3,
            'sticky top-4 z-30 rounded-xl p-4 text-red-800 shadow-sm backdrop-blur-sm dark:text-red-300',
          )}
        >
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </Alert>
      )}

      <form className="space-y-8" onSubmit={onSubmit}>
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <RegisterSidebar {...sidebar} />

          <div className="space-y-8">
            <RegisterMetaSection {...meta} />
            <RegisterDescriptionSection {...description} />
            <PackageLicenseSection {...license} />
            <PackageImagesSection {...images} />
            <PackageInstallerSection {...installer} />
            <PackageVersionSection {...versions} />
            <RegisterPreviewSection {...preview} />
            <RegisterTestSection {...tests} />
            <RegisterSubmitBar {...submitBar} />
          </div>
        </div>
      </form>
    </main>
  );
}
