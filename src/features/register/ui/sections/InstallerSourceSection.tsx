/**
 * インストーラーのソースコンポーネント
 */
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Alert } from '@/components/ui/Alert';
import Button, { buttonVariants } from '@/components/ui/Button';
import { ExternalLink } from 'lucide-react';
import { INSTALLER_SOURCES } from '../../model/form';
import type { PackageInstallerSectionProps } from '../types';
import SegmentedOptionGroup from '../components/SegmentedOptionGroup';
import { grid, layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

type InstallerSourceSectionProps = Pick<
  PackageInstallerSectionProps,
  | 'installer'
  | 'updateInstallerField'
  | 'packageFileName'
  | 'packageFileSummary'
  | 'packageFileError'
  | 'packageFileImporting'
  | 'onSelectPackageFile'
>;

const autoUpdateStatusUrl =
  'https://github.com/Neosku/aviutl2-catalog-data/blob/main/%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8.md';

export default function InstallerSourceSection({
  installer,
  updateInstallerField,
  packageFileName,
  packageFileSummary,
  packageFileError,
  packageFileImporting,
  onSelectPackageFile,
}: InstallerSourceSectionProps) {
  const { t } = useTranslation('register');
  const installerSourceOptions = useMemo(
    () =>
      INSTALLER_SOURCES.map((option) => ({
        value: option.value,
        label:
          option.value === 'GoogleDrive'
            ? t('installer.sourceTypes.googleDrive')
            : t(`installer.sourceTypes.${option.value}`),
      })),
    [t],
  );
  const packageFileSummaryText = packageFileSummary
    ? packageFileSummary.groups
        .map((group) => t('installer.packageFileGroupSummary', { root: group.root, count: group.count }))
        .join(' / ')
    : '';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className={text.labelSm}>{t('installer.downloadSource')}</div>
        <SegmentedOptionGroup
          value={installer.sourceType}
          options={installerSourceOptions}
          onChange={(value) => updateInstallerField('sourceType', value)}
          ariaLabel={t('installer.downloadSource')}
        />
      </div>
      <div className={cn(surface.panel, 'p-4')}>
        {installer.sourceType === 'direct' && (
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="installer-direct-url">
              {t('installer.directUrl')}
            </label>
            <input
              id="installer-direct-url"
              value={installer.directUrl}
              onChange={(e) => updateInstallerField('directUrl', e.target.value)}
              placeholder="https://example.com/plugin.zip"
            />
          </div>
        )}
        {installer.sourceType === 'booth' && (
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="installer-booth-url">
              {t('installer.boothUrl')}
            </label>
            <input
              id="installer-booth-url"
              value={installer.boothUrl}
              onChange={(e) => updateInstallerField('boothUrl', e.target.value)}
              placeholder={t('installer.boothPlaceholder')}
            />
          </div>
        )}
        {installer.sourceType === 'github' && (
          <div className="space-y-4">
            <div className={grid.twoCol}>
              <div className="space-y-2">
                <label className={text.labelSm} htmlFor="installer-github-owner">
                  {t('installer.githubOwner')}
                </label>
                <input
                  id="installer-github-owner"
                  value={installer.githubOwner}
                  onChange={(e) => updateInstallerField('githubOwner', e.target.value)}
                  placeholder={t('installer.githubOwnerPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className={text.labelSm} htmlFor="installer-github-repo">
                  {t('installer.githubRepo')}
                </label>
                <input
                  id="installer-github-repo"
                  value={installer.githubRepo}
                  onChange={(e) => updateInstallerField('githubRepo', e.target.value)}
                  placeholder={t('installer.githubRepoPlaceholder')}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className={text.labelSm} htmlFor="installer-github-pattern">
                  {t('installer.githubPattern')}
                </label>
                <input
                  id="installer-github-pattern"
                  value={installer.githubPattern}
                  onChange={(e) => updateInstallerField('githubPattern', e.target.value)}
                  placeholder="^aviutl_plugin_.*\.zip$"
                />
                <p className={text.mutedXs}>{t('installer.githubPatternHint')}</p>
              </div>
            </div>

            <div className={cn(surface.panelRoundedSubtle, 'space-y-3 p-3')}>
              <p className={text.bodySmMuted}>{t('installer.githubAutoUpdateHint')}</p>
              <a
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-fit')}
                href={autoUpdateStatusUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                <ExternalLink size={14} />
                {t('installer.githubAutoUpdateLink')}
              </a>
            </div>
          </div>
        )}
        {installer.sourceType === 'GoogleDrive' && (
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="installer-google-drive-id">
              {t('installer.googleDriveId')}
            </label>
            <input
              id="installer-google-drive-id"
              value={installer.googleDriveId}
              onChange={(e) => updateInstallerField('googleDriveId', e.target.value)}
              placeholder={t('installer.googleDrivePlaceholder')}
            />
          </div>
        )}
      </div>
      <div className={cn(surface.panelSubtle, 'space-y-3 p-4')}>
        <div className="space-y-1">
          <div className={text.labelSm}>{t('installer.packageFileTitle')}</div>
          <p className={text.bodySmMuted}>{t('installer.packageFileDescription')}</p>
        </div>
        <div className={layout.wrapItemsGap2}>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onSelectPackageFile}
            disabled={packageFileImporting}
          >
            {packageFileImporting ? t('installer.packageFileAnalyzing') : t('installer.packageFileSelect')}
          </Button>
          {packageFileName && <span className={text.bodySmMuted}>{packageFileName}</span>}
        </div>
        {packageFileSummary && (
          <div className={cn(surface.panelRoundedSubtle, 'space-y-1 p-3')}>
            <div className={text.labelXsSemibold}>{t('installer.packageFileGeneratedTitle')}</div>
            <p className={text.bodySmMuted}>
              {t('installer.packageFileGeneratedSummary', { count: packageFileSummary.totalFiles })}
              {packageFileSummaryText ? ` (${packageFileSummaryText})` : ''}
            </p>
          </div>
        )}
        {packageFileError && <Alert variant="danger">{packageFileError}</Alert>}
      </div>
    </div>
  );
}
