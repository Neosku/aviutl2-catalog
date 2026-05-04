/**
 * Package relation fields.
 */
import { useTranslation } from 'react-i18next';
import type { RegisterRelationsSectionProps } from '../types';
import { grid, layout, surface, text } from '@/components/ui/_styles';

type RelationTextField =
  | 'relationRecommendsText'
  | 'relationConflictsText'
  | 'relationSimilarText'
  | 'relationReplacesText';
type EditableRelationArrayField = 'recommends' | 'conflicts' | 'similar' | 'replaces';

const relationTextFields = [
  { relation: 'recommends', formField: 'relationRecommendsText' },
  { relation: 'conflicts', formField: 'relationConflictsText' },
  { relation: 'similar', formField: 'relationSimilarText' },
  { relation: 'replaces', formField: 'relationReplacesText' },
] as const satisfies readonly { relation: EditableRelationArrayField; formField: RelationTextField }[];

export default function RegisterRelationsSection({ packageForm, onUpdatePackageField }: RegisterRelationsSectionProps) {
  const { t } = useTranslation('register');

  return (
    <section className={surface.cardSection}>
      <div className={layout.rowBetweenWrapGap2}>
        <div className="space-y-1">
          <h2 className={text.titleLg}>{t('relations.title')}</h2>
          <p className={text.bodySmMuted}>{t('relations.description')}</p>
        </div>
      </div>
      <div className={grid.twoColWideGap}>
        <div className="space-y-2">
          <label className={text.labelSm} htmlFor="package-relation-requires">
            {t('relations.requires')}
          </label>
          <input
            id="package-relation-requires"
            name="relation-requires"
            value={packageForm.relationRequiresText}
            onChange={(e) => onUpdatePackageField('relationRequiresText', e.target.value)}
            placeholder={t('relations.placeholder')}
          />
        </div>
        {relationTextFields.map(({ relation, formField }) => (
          <div key={relation} className="space-y-2">
            <label className={text.labelSm} htmlFor={`package-relation-${relation}`}>
              {t(`relations.${relation}`)}
            </label>
            <input
              id={`package-relation-${relation}`}
              name={`relation-${relation}`}
              value={packageForm[formField]}
              onChange={(e) => onUpdatePackageField(formField, e.target.value)}
              placeholder={t('relations.placeholder')}
            />
          </div>
        ))}
        <div className="space-y-2">
          <label className={text.labelSm} htmlFor="package-relation-fork-of">
            {t('relations.forkOf')}
          </label>
          <input
            id="package-relation-fork-of"
            name="relation-fork-of"
            value={packageForm.relationForkOfText}
            onChange={(e) => onUpdatePackageField('relationForkOfText', e.target.value)}
            placeholder={t('relations.forkOfPlaceholder')}
          />
        </div>
      </div>
    </section>
  );
}
