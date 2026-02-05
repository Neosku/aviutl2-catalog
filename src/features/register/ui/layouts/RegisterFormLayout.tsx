/**
 * 登録画面全体のレイアウトコンポーネント
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';
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

export default function RegisterFormLayout({
  title,
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
      <header className="pb-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      </header>

      {error && (
        <div
          className="sticky top-4 z-30 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm backdrop-blur-sm dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      <form className="space-y-8" onSubmit={onSubmit}>
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
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
