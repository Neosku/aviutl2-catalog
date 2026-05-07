import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FileJson, Wrench } from 'lucide-react';
import type { MaintainerSettingsSectionProps } from '../types';
import SettingToggleRow from './SettingToggleRow';
import { surface, text } from '@/components/ui/_styles';

export default function MaintainerSettingsSection({
  form,
  onLocalModeToggle,
  onLocalManifestPathChange,
  onPickLocalManifest,
}: MaintainerSettingsSectionProps) {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <section className={surface.panelOverflow}>
      <div className={surface.sectionHeader}>
        <Wrench size={18} className="text-slate-500 dark:text-slate-400" />
        <h3 className={text.headingSmBold}>{t('sections.developer')}</h3>
      </div>
      <div className="p-6 space-y-6">
        <SettingToggleRow
          title={t('app.developerMode.title')}
          description={t('app.developerMode.description')}
          checked={form.localModeEnabled}
          onToggle={() => onLocalModeToggle(!form.localModeEnabled)}
        />

        {form.localModeEnabled ? (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="settings-local-manifest">
              {t('app.developerManifest.label')}
            </label>
            <div className={text.mutedXs}>{t('app.developerManifest.description')}</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="settings-local-manifest"
                name="localManifestPath"
                value={form.localManifestPath}
                onChange={onLocalManifestPathChange}
                className="flex-1 cursor-text select-text"
                placeholder={t('app.developerManifest.placeholder')}
              />
              <Button
                variant="secondary"
                size="default"
                type="button"
                className="cursor-pointer"
                onClick={onPickLocalManifest}
              >
                <FileJson size={16} />
                {t('common:actions.browse')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
