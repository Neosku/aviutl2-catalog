import { Alert } from '@/components/ui/Alert';
import useSettingsPage from './hooks/useSettingsPage';
import { AppInfoSection, AppSettingsSection, DataManagementSection } from './sections';
import { page, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function SettingsPage() {
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
    onPortableToggle,
    onPackageStateEnabledToggle,
    onToggleTheme,
    onPickAviutl2Root,
    onSave,
    onExport,
    onImport,
  } = useSettingsPage();

  return (
    <div className={cn(page.container3xl, page.selectNone, page.enterFromBottom, 'space-y-7')}>
      <div>
        <h2 className={cn(text.title2xlStrong, 'mb-2')}>設定</h2>
        <p className={text.mutedSm}>アプリケーションの設定とカスタマイズ</p>
      </div>

      {error ? (
        <Alert variant="danger" className="rounded-xl">
          {error}
        </Alert>
      ) : null}

      <AppSettingsSection
        form={form}
        packageStateEnabled={packageStateEnabled}
        saving={saving}
        success={success}
        onAviutl2RootChange={onAviutl2RootChange}
        onPortableToggle={onPortableToggle}
        onPackageStateEnabledToggle={onPackageStateEnabledToggle}
        onPickAviutl2Root={onPickAviutl2Root}
        onToggleTheme={onToggleTheme}
        onSave={onSave}
      />
      <DataManagementSection syncBusy={syncBusy} syncStatus={syncStatus} onExport={onExport} onImport={onImport} />
      <AppInfoSection appVersion={appVersion} />
    </div>
  );
}
