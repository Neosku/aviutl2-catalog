/**
 * 更新履歴のmarkdown入力セクション
 */
import { useTranslation } from 'react-i18next';
import type { RegisterChangelogSectionProps } from '../types';
import MarkdownModeSwitch from '../components/MarkdownModeSwitch';
import { layout, surface, text } from '@/components/ui/_styles';

export default function RegisterChangelogSection({ packageForm, onUpdatePackageField }: RegisterChangelogSectionProps) {
  const { t } = useTranslation('register');
  const isExternalChangelog = packageForm.changelogMode === 'external';

  return (
    <section className={surface.cardSection}>
      <div className="space-y-1">
        <h2 className={text.titleLg}>{t('changelog.title')}</h2>
        <p className={text.bodySmMuted}>{t('changelog.body')}</p>
      </div>

      <details className={surface.panelSubtle}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t('changelog.formatTitle')}
        </summary>
        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t('changelog.formatBody')}
          </p>
          <pre className="overflow-auto rounded-lg bg-white p-3 font-mono text-xs leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {t('changelog.formatExample')}
          </pre>
        </div>
      </details>

      <div className={layout.rowBetweenWrapGap2}>
        <label
          className={text.labelSm}
          htmlFor={isExternalChangelog ? 'package-changelog-url' : 'package-changelog-text'}
        >
          {t('changelog.title')}
        </label>
        <MarkdownModeSwitch
          isExternal={isExternalChangelog}
          onInline={() => onUpdatePackageField('changelogMode', 'inline')}
          onExternal={() => onUpdatePackageField('changelogMode', 'external')}
        />
      </div>

      {isExternalChangelog ? (
        <div className="space-y-2">
          <input
            id="package-changelog-url"
            name="changelogUrl"
            type="url"
            value={packageForm.changelogUrl}
            onChange={(e) => onUpdatePackageField('changelogUrl', e.target.value)}
            placeholder="https://example.com/changelog.md"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            id="package-changelog-text"
            className="min-h-[260px] font-mono text-sm leading-relaxed"
            value={packageForm.changelogText}
            onChange={(e) => onUpdatePackageField('changelogText', e.target.value)}
            placeholder={t('changelog.formatExample')}
          />
        </div>
      )}
    </section>
  );
}
