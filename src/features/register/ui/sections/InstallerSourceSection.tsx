/**
 * インストーラーのソースコンポーネント
 */
import Button from '@/components/ui/Button';
import { INSTALLER_SOURCES } from '../../model/form';
import type { PackageInstallerSectionProps } from '../types';
import { grid, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

type InstallerSourceSectionProps = Pick<PackageInstallerSectionProps, 'installer' | 'updateInstallerField'>;

export default function InstallerSourceSection({ installer, updateInstallerField }: InstallerSourceSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className={text.labelSm}>ダウンロード元</div>
        <div className={cn(surface.panelSubtle, 'flex flex-wrap gap-1 p-1')}>
          {INSTALLER_SOURCES.map((option) => {
            const isActive = installer.sourceType === option.value;
            return (
              <Button
                variant="plain"
                size="xs"
                key={option.value}
                type="button"
                className={cn(
                  'flex-1 transition-all',
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                )}
                onClick={() => updateInstallerField('sourceType', option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>
      <div className={cn(surface.panel, 'p-4')}>
        {installer.sourceType === 'direct' && (
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="installer-direct-url">
              ダウンロードURL
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
              BOOTH URL
            </label>
            <input
              id="installer-booth-url"
              value={installer.boothUrl}
              onChange={(e) => updateInstallerField('boothUrl', e.target.value)}
              placeholder="https://booth.pm/downloadables/...で始まるパス"
            />
          </div>
        )}
        {installer.sourceType === 'github' && (
          <div className={grid.twoCol}>
            <div className="space-y-2">
              <label className={text.labelSm} htmlFor="installer-github-owner">
                GitHub ID (Owner)
              </label>
              <input
                id="installer-github-owner"
                value={installer.githubOwner}
                onChange={(e) => updateInstallerField('githubOwner', e.target.value)}
                placeholder="例: neosku"
              />
            </div>
            <div className="space-y-2">
              <label className={text.labelSm} htmlFor="installer-github-repo">
                レポジトリ名 (Repo)
              </label>
              <input
                id="installer-github-repo"
                value={installer.githubRepo}
                onChange={(e) => updateInstallerField('githubRepo', e.target.value)}
                placeholder="例: aviutl2-catalog"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className={text.labelSm} htmlFor="installer-github-pattern">
                正規表現パターン
              </label>
              <input
                id="installer-github-pattern"
                value={installer.githubPattern}
                onChange={(e) => updateInstallerField('githubPattern', e.target.value)}
                placeholder="^aviutl_plugin_.*\.zip$"
              />
              <p className={text.mutedXs}>リリースファイル名に一致する正規表現を指定してください。</p>
            </div>
          </div>
        )}
        {installer.sourceType === 'GoogleDrive' && (
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="installer-google-drive-id">
              ファイルID
            </label>
            <input
              id="installer-google-drive-id"
              value={installer.googleDriveId}
              onChange={(e) => updateInstallerField('googleDriveId', e.target.value)}
              placeholder="Google Drive の共有リンクに含まれるID（…/drive/folders/{フォルダID}）"
            />
          </div>
        )}
      </div>
    </div>
  );
}
