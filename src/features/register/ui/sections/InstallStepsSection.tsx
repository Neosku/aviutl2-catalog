/**
 * インストール手順コンポーネント
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import { GripVertical, Plus } from 'lucide-react';
import { INSTALL_ACTION_OPTIONS, SPECIAL_INSTALL_ACTIONS } from '../../model/form';
import type { PackageInstallerSectionProps } from '../types';
import ActionDropdown from '../components/ActionDropdown';
import DeleteButton from '../components/DeleteButton';
import { cn } from '@/lib/cn';
import { action, grid, layout, surface, text } from '@/components/ui/_styles';

type InstallStepsSectionProps = Pick<
  PackageInstallerSectionProps,
  'installer' | 'installListRef' | 'addInstallStep' | 'removeInstallStep' | 'startHandleDrag' | 'updateInstallStep'
>;

export default function InstallStepsSection({
  installer,
  installListRef,
  addInstallStep,
  removeInstallStep,
  startHandleDrag,
  updateInstallStep,
}: InstallStepsSectionProps) {
  const { t } = useTranslation('register');
  const installActionOptions = useMemo(
    () =>
      INSTALL_ACTION_OPTIONS.map((option) => ({
        ...option,
        label: t(`installer.actions.${option.value}`),
      })),
    [t],
  );
  return (
    <div className="space-y-4">
      <div className={layout.rowBetweenWrapGap2}>
        <h3 className={text.titleBaseBold}>{t('installer.installSteps')}</h3>
        <Button variant="plain" size="none" type="button" className={action.stepAddButton} onClick={addInstallStep}>
          <Plus size={14} />
          <span>{t('installer.addStep')}</span>
        </Button>
      </div>
      <div className="space-y-3" ref={installListRef}>
        {installer.installSteps.map((step, idx) => {
          const order = idx + 1;
          const isSpecialAction = SPECIAL_INSTALL_ACTIONS.includes(step.action);
          return (
            <div key={step.key} className={surface.stepCard}>
              <div className={layout.wrapItemsGap3}>
                <div className={layout.inlineGap2}>
                  <span className={surface.stepNumberBadge}>{order}</span>
                  {!isSpecialAction && (
                    <Button
                      variant="plain"
                      size="none"
                      type="button"
                      className={action.dragHandle}
                      onPointerDown={(e) => startHandleDrag('install', idx, e)}
                      aria-label={t('installer.dragAria')}
                    >
                      <GripVertical size={16} />
                    </Button>
                  )}
                </div>
                <div className="flex-1 min-w-[120px]">
                  {isSpecialAction ? (
                    <div
                      className={cn(
                        layout.inlineGap2,
                        'rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                      )}
                    >
                      {t(`installer.actions.${step.action}`, {
                        defaultValue: step.action,
                      })}
                      <span className={cn('ml-auto', text.optionalMuted)}>{t('installer.fixedStep')}</span>
                    </div>
                  ) : (
                    <ActionDropdown
                      value={step.action}
                      onChange={(val) => updateInstallStep(step.key, 'action', val)}
                      options={installActionOptions}
                      ariaLabel={t('installer.stepTypeAria')}
                    />
                  )}
                </div>
                <div className={layout.inlineGap2}>
                  {!isSpecialAction && (
                    <DeleteButton onClick={() => removeInstallStep(step.key)} ariaLabel={t('installer.deleteStep')} />
                  )}
                </div>
              </div>
              {!isSpecialAction && step.action === 'run' && (
                <div className={grid.panelTwoCol}>
                  <div className="space-y-1">
                    <label className={text.labelXs} htmlFor={`install-${step.key}-path`}>
                      {t('installer.runPath')}
                    </label>
                    <input
                      id={`install-${step.key}-path`}
                      value={step.path}
                      onChange={(e) => updateInstallStep(step.key, 'path', e.target.value)}
                      placeholder="{tmp}/setup.exe"
                      className="!bg-white dark:!bg-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={text.labelXs} htmlFor={`install-${step.key}-args`}>
                      {t('installer.args')}
                    </label>
                    <input
                      id={`install-${step.key}-args`}
                      value={step.argsText}
                      onChange={(e) => updateInstallStep(step.key, 'argsText', e.target.value)}
                      placeholder="--silent, --option"
                      className="!bg-white dark:!bg-slate-800"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={action.inlineToggleOption}>
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={!!step.elevate}
                        onChange={(e) => updateInstallStep(step.key, 'elevate', e.target.checked)}
                      />
                      <span>{t('installer.runAsAdmin')}</span>
                    </label>
                  </div>
                </div>
              )}
              {!isSpecialAction && step.action === 'delete' && (
                <div className="grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                  <div className="space-y-1">
                    <label className={text.labelXs} htmlFor={`install-${step.key}-path`}>
                      {t('installer.deletePath')}
                    </label>
                    <input
                      id={`install-${step.key}-path`}
                      value={step.path}
                      onChange={(e) => updateInstallStep(step.key, 'path', e.target.value)}
                      placeholder={t('installer.deletePathPlaceholder')}
                      className="!bg-white dark:!bg-slate-800"
                    />
                  </div>
                </div>
              )}
              {!isSpecialAction && step.action === 'copy' && (
                <div className={grid.panelTwoCol}>
                  <div className="space-y-1">
                    <label className={text.labelXs} htmlFor={`install-${step.key}-from`}>
                      {t('installer.copyFrom')}
                    </label>
                    <input
                      id={`install-${step.key}-from`}
                      value={step.from}
                      onChange={(e) => updateInstallStep(step.key, 'from', e.target.value)}
                      placeholder={t('installer.copyFromPlaceholder')}
                      className="!bg-white dark:!bg-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={text.labelXs} htmlFor={`install-${step.key}-to`}>
                      {t('installer.copyTo')}
                    </label>
                    <input
                      id={`install-${step.key}-to`}
                      value={step.to}
                      onChange={(e) => updateInstallStep(step.key, 'to', e.target.value)}
                      placeholder={t('installer.copyToPlaceholder')}
                      className="!bg-white dark:!bg-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!installer.installSteps.length && (
          <div className={surface.dashedPlaceholder}>
            <span className="text-xs">{t('installer.installStepsEmpty')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
