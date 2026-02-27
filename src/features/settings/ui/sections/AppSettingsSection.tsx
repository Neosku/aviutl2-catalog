import type { CSSProperties } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Check, FolderOpen, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import type { AppSettingsSectionProps } from '../types';
import SettingToggleRow from './SettingToggleRow';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

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
    <section className={surface.panelOverflow}>
      <div className={surface.sectionHeader}>
        <SettingsIcon size={18} className="text-slate-500 dark:text-slate-400" />
        <h3 className={text.headingSmBold}>アプリ設定</h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="settings-aviutl2-root">
            AviUtl2 フォルダ
          </label>
          <div className={text.mutedXs}>aviutl2.exeを含むフォルダを指定してください。</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="settings-aviutl2-root"
              name="aviutl2Root"
              value={form.aviutl2Root}
              onChange={onAviutl2RootChange}
              className="flex-1 cursor-text select-text"
              placeholder="aviutl2.exe のあるフォルダ"
            />
            <Button
              variant="secondary"
              size="default"
              type="button"
              className="cursor-pointer"
              onClick={onPickAviutl2Root}
            >
              <FolderOpen size={16} />
              参照
            </Button>
          </div>
        </div>

        <SettingToggleRow
          title={
            <>
              ポータブルモード <span className={cn(text.mutedXs, 'font-normal')}>（オフ推奨）</span>
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

        <div className={cn(layout.inlineGap2, 'flex-wrap justify-end border-slate-100 dark:border-slate-800')}>
          <Button
            variant={success ? 'success' : 'primary'}
            size="actionSm"
            onClick={onSave}
            disabled={saving || Boolean(success)}
            type="button"
            className="cursor-pointer"
          >
            {success && <Check size={16} />}
            {success ? '保存しました' : '設定を保存'}
          </Button>
        </div>
      </div>
    </section>
  );
}
