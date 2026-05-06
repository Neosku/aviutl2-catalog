import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/Alert';
import useSettingsPage from './hooks/useSettingsPage';
import { AppInfoSection, AppSettingsSection, DataManagementSection, MaintainerSettingsSection } from './sections';
import { page, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const noticeAnchorRef = useRef<HTMLDivElement | null>(null);
  const [noticeFrame, setNoticeFrame] = useState<{ left: number; top: number; width: number } | null>(null);
  const {
    form,
    saving,
    error,
    success,
    appVersion,
    syncBusy,
    syncStatus,
    packageStateEnabled,
    onAviutl2RootChange,
    onLocaleChange,
    onPortableToggle,
    onPackageStateEnabledToggle,
    onLocalModeToggle,
    onLocalManifestPathChange,
    onToggleTheme,
    onPickAviutl2Root,
    onPickLocalManifest,
    onExport,
    onImport,
  } = useSettingsPage();
  const statusNotice = error
    ? { variant: 'danger' as const, message: error }
    : saving
      ? { variant: 'info' as const, message: t('messages.autoSaving') }
      : success
        ? { variant: 'success' as const, message: success }
        : null;

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const anchor = noticeAnchorRef.current;
      if (!container || !anchor) return;

      const containerRect = container.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      setNoticeFrame({
        left: containerRect.left,
        top: anchorRect.top,
        width: containerRect.width,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div ref={containerRef} className={cn(page.container3xl, page.selectNone, page.enterFromBottom, 'space-y-7')}>
      <div ref={noticeAnchorRef} aria-hidden="true" className="h-0" />
      {statusNotice && noticeFrame ? (
        <div className="pointer-events-none fixed z-[20] flex justify-center" style={noticeFrame}>
          <Alert
            variant={statusNotice.variant}
            className="pointer-events-auto min-h-11 w-full rounded-xl px-5 py-3 text-center font-medium shadow-lg"
          >
            {statusNotice.message}
          </Alert>
        </div>
      ) : null}

      <div>
        <h2 className={cn(text.title2xlStrong, 'mb-2')}>{t('page.title')}</h2>
        <p className={text.mutedSm}>{t('page.description')}</p>
      </div>

      <AppSettingsSection
        form={form}
        packageStateEnabled={packageStateEnabled}
        onAviutl2RootChange={onAviutl2RootChange}
        onLocaleChange={onLocaleChange}
        onPortableToggle={onPortableToggle}
        onPackageStateEnabledToggle={onPackageStateEnabledToggle}
        onPickAviutl2Root={onPickAviutl2Root}
        onToggleTheme={onToggleTheme}
      />
      <MaintainerSettingsSection
        form={form}
        onLocalModeToggle={onLocalModeToggle}
        onLocalManifestPathChange={onLocalManifestPathChange}
        onPickLocalManifest={onPickLocalManifest}
      />
      <DataManagementSection syncBusy={syncBusy} syncStatus={syncStatus} onExport={onExport} onImport={onImport} />
      <AppInfoSection appVersion={appVersion} />
    </div>
  );
}
