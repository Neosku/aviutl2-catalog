import type { CSSProperties } from 'react';
import { Check, FolderOpen, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import type { AppSettingsSectionProps } from '../types';
import SettingToggleRow from './SettingToggleRow';

const iconBlockStyle: CSSProperties = { display: 'block' };

export default function AppSettingsSection({
  form,
  packageStateEnabled,
  saving,
  success,
  onAviutl2RootChange,
  onPortableToggle,
  onPackageStateEnabledToggle,
  onPickAviutl2Root,
  onToggleTheme,
  onSave,
}: AppSettingsSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
        <SettingsIcon size={18} className="text-slate-500 dark:text-slate-400" />
        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">アプリ設定</h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="settings-aviutl2-root">
            AviUtl2 フォルダ
          </label>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            aviutl2.exeを含むフォルダを指定してください。
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="settings-aviutl2-root"
              name="aviutl2Root"
              value={form.aviutl2Root}
              onChange={onAviutl2RootChange}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm cursor-text select-text"
              placeholder="aviutl2.exe のあるフォルダ"
            />
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              type="button"
              onClick={onPickAviutl2Root}
            >
              <FolderOpen size={16} />
              参照
            </button>
          </div>
        </div>

        <SettingToggleRow
          title={
            <>
              ポータブルモード{' '}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">（オフ推奨）</span>
            </>
          }
          description="プラグインやスクリプトを aviutl2.exe と同じ階層にある data フォルダに保存します"
          checked={form.isPortableMode}
          onToggle={() => onPortableToggle(!form.isPortableMode)}
        />

        <SettingToggleRow
          title="ダークモード"
          checked={form.theme !== 'lightmode'}
          onToggle={onToggleTheme}
          thumbContent={
            form.theme === 'lightmode' ? (
              <Sun size={12} className="text-slate-400" style={iconBlockStyle} />
            ) : (
              <Moon size={12} className="text-blue-600" style={iconBlockStyle} />
            )
          }
        />

        <SettingToggleRow
          title="匿名統計の送信"
          description="利用状況を参考にした表示を提供するため、インストール・アンインストールされたパッケージID、およびインストール済みパッケージIDを匿名で送信します。ご協力をお願いします。"
          checked={packageStateEnabled}
          onToggle={() => onPackageStateEnabledToggle(!packageStateEnabled)}
        />

        <div className="flex flex-wrap items-center justify-end gap-2 border-slate-100 dark:border-slate-800">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-200 disabled:opacity-60 cursor-pointer ${
              success ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={onSave}
            disabled={saving || Boolean(success)}
            type="button"
          >
            {success && <Check size={16} />}
            {success ? '保存しました' : '設定を保存'}
          </button>
        </div>
      </div>
    </section>
  );
}
