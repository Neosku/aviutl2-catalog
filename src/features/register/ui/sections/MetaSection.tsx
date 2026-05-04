/**
 * パッケージ基本情報登録セクションのコンポーネント
 */
import { useTranslation } from 'react-i18next';
import { catalogPackageRoleValues, type CatalogPackageRole } from '@/utils/catalog-schema/shared/commonSchema';
import type { RegisterMetaSectionProps } from '../types';
import PackageTypeEditor from './PackageTypeEditor';
import TagEditor from './TagEditor';
import { grid, layout, surface, text } from '@/components/ui/_styles';

export default function RegisterMetaSection({
  packageForm,
  initialTags,
  tagCandidates,
  onUpdatePackageField,
  onTagsChange,
}: RegisterMetaSectionProps) {
  const { t } = useTranslation(['register', 'common']);

  return (
    <section className={surface.cardSection}>
      <div className={layout.rowBetweenWrapGap2}>
        <h2 className={text.titleLg}>{t('meta.title')}</h2>
      </div>
      <div className="grid gap-6">
        <div className={grid.twoColWideGap}>
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="package-id">
              {t('common:labels.id')} <span className="text-red-500">*</span>
            </label>
            <input
              id="package-id"
              name="id"
              value={packageForm.id}
              onChange={(e) => onUpdatePackageField('id', e.target.value)}
              required
              placeholder={t('meta.idPlaceholder')}
            />
            <p className={text.mutedXs}>{t('meta.idHint')}</p>
          </div>
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="package-name">
              {t('meta.name')} <span className="text-red-500">*</span>
            </label>
            <input
              id="package-name"
              name="name"
              value={packageForm.name}
              onChange={(e) => onUpdatePackageField('name', e.target.value)}
              required
              placeholder={t('meta.namePlaceholder')}
            />
          </div>
        </div>

        <div className={grid.twoColWideGap}>
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="package-author">
              {t('meta.author')} <span className="text-red-500">*</span>
            </label>
            <input
              id="package-author"
              name="author"
              value={packageForm.author}
              onChange={(e) => onUpdatePackageField('author', e.target.value)}
              required
              placeholder={t('meta.authorPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="package-original-author">
              {t('meta.originalAuthor')}
            </label>
            <input
              id="package-original-author"
              name="originalAuthor"
              value={packageForm.originalAuthor}
              onChange={(e) => onUpdatePackageField('originalAuthor', e.target.value)}
              placeholder={t('meta.originalAuthorPlaceholder')}
            />
          </div>
          <div className="md:col-span-2">
            <PackageTypeEditor value={packageForm.type} onChange={(value) => onUpdatePackageField('type', value)} />
          </div>
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="package-role">
              {t('meta.packageRole')}
            </label>
            <select
              id="package-role"
              name="packageRole"
              value={packageForm.packageRole}
              onChange={(e) => onUpdatePackageField('packageRole', e.target.value as CatalogPackageRole)}
            >
              {catalogPackageRoleValues.map((role) => (
                <option key={role} value={role}>
                  {t(`meta.packageRoleOptions.${role}`)}
                </option>
              ))}
            </select>
            <p className={text.mutedXs}>{t('meta.packageRoleHint')}</p>
          </div>
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="package-repo-url">
              {t('meta.repoUrl')} <span className="text-red-500">*</span>
            </label>
            <input
              id="package-repo-url"
              name="repoURL"
              value={packageForm.repoURL}
              onChange={(e) => onUpdatePackageField('repoURL', e.target.value)}
              placeholder={t('meta.repoUrlPlaceholder')}
              type="url"
              required
            />
          </div>
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="package-niconi-commons-id">
              {t('meta.niconiCommonsId')}
            </label>
            <input
              id="package-niconi-commons-id"
              name="niconiCommonsId"
              value={packageForm.niconiCommonsId}
              onChange={(e) => onUpdatePackageField('niconiCommonsId', e.target.value)}
              placeholder=""
            />
          </div>
        </div>

        <TagEditor initialTags={initialTags} suggestions={tagCandidates} onChange={onTagsChange} />

        <div className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
          <label className="flex items-center gap-3">
            <input
              id="package-deprecation-enabled"
              name="deprecationEnabled"
              type="checkbox"
              checked={packageForm.deprecationEnabled}
              onChange={(e) => onUpdatePackageField('deprecationEnabled', e.target.checked)}
              className="h-4 w-4"
            />
            <span className={text.labelSm}>{t('meta.deprecationEnabled')}</span>
          </label>
          <div className="space-y-2">
            <label className={text.labelSm} htmlFor="package-deprecation-message">
              {t('meta.deprecationMessage')}
            </label>
            <p className={text.mutedXs}>{t('meta.deprecationHint')}</p>
            <input
              id="package-deprecation-message"
              name="deprecationMessage"
              value={packageForm.deprecationMessage}
              onChange={(e) => onUpdatePackageField('deprecationMessage', e.target.value)}
              placeholder={t('meta.deprecationPlaceholder')}
              disabled={!packageForm.deprecationEnabled}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
