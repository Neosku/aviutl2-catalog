import useSettingsPage from './hooks/useSettingsPage';
import { AppInfoSection, AppSettingsSection, DataManagementSection } from './sections';

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
    <div className="max-w-3xl mx-auto space-y-7 animate-in slide-in-from-bottom-2 duration-300 select-none">
      <div>
        <h2 className="text-2xl font-bold mb-2">設定</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">アプリケーションの設定とカスタマイズ</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
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
