/**
 * アンインストール手順コンポーネント
 */
import React from 'react';
import Button from '@/components/ui/Button';
import { GripVertical, Plus } from 'lucide-react';
import { UNINSTALL_ACTION_OPTIONS } from '../../model/form';
import type { PackageInstallerSectionProps } from '../types';
import ActionDropdown from '../components/ActionDropdown';
import DeleteButton from '../components/DeleteButton';
import { action, grid, layout, surface, text } from '@/components/ui/_styles';

type UninstallStepsSectionProps = Pick<
  PackageInstallerSectionProps,
  | 'installer'
  | 'uninstallListRef'
  | 'addUninstallStep'
  | 'removeUninstallStep'
  | 'startHandleDrag'
  | 'updateUninstallStep'
>;

export default function UninstallStepsSection({
  installer,
  uninstallListRef,
  addUninstallStep,
  removeUninstallStep,
  startHandleDrag,
  updateUninstallStep,
}: UninstallStepsSectionProps) {
  return (
    <div className="space-y-4">
      <div className={layout.rowBetweenWrapGap2}>
        <h3 className={text.titleBaseBold}>アンインストール手順</h3>
        <Button variant="plain" size="none" type="button" className={action.stepAddButton} onClick={addUninstallStep}>
          <Plus size={14} />
          <span>ステップを追加</span>
        </Button>
      </div>
      <div className="space-y-3" ref={uninstallListRef}>
        {installer.uninstallSteps.map((step, idx) => {
          const order = idx + 1;
          return (
            <div key={step.key} className={surface.stepCard}>
              <div className={layout.wrapItemsGap3}>
                <div className={layout.inlineGap2}>
                  <span className={surface.stepNumberBadge}>{order}</span>
                  <Button
                    variant="plain"
                    size="none"
                    type="button"
                    className={action.dragHandle}
                    onPointerDown={(e) => startHandleDrag('uninstall', idx, e)}
                    aria-label="ドラッグして並び替え"
                  >
                    <GripVertical size={16} />
                  </Button>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <ActionDropdown
                    value={step.action}
                    onChange={(val) => updateUninstallStep(step.key, 'action', val)}
                    options={UNINSTALL_ACTION_OPTIONS}
                    ariaLabel="ステップの種類を選択"
                  />
                </div>
                <div className={layout.inlineGap2}>
                  <DeleteButton onClick={() => removeUninstallStep(step.key)} ariaLabel="ステップを削除" />
                </div>
              </div>
              <div className={grid.panelTwoCol}>
                <div className="space-y-1">
                  <label className={text.labelXs} htmlFor={`uninstall-${step.key}-path`}>
                    対象パス
                  </label>
                  <input
                    id={`uninstall-${step.key}-path`}
                    value={step.path}
                    onChange={(e) => updateUninstallStep(step.key, 'path', e.target.value)}
                    placeholder={
                      step.action === 'delete' ? '(例: {pluginsDir}/example.auo)' : '(例: {appDir}/uninstall.exe)'
                    }
                    className="!bg-white dark:!bg-slate-800"
                  />
                </div>
                {step.action === 'run' && (
                  <>
                    <div className="space-y-1">
                      <label className={text.labelXs} htmlFor={`uninstall-${step.key}-args`}>
                        引数 (カンマ区切り)
                      </label>
                      <input
                        id={`uninstall-${step.key}-args`}
                        value={step.argsText}
                        onChange={(e) => updateUninstallStep(step.key, 'argsText', e.target.value)}
                        placeholder="(例: /VERYSILENT)"
                        className="!bg-white dark:!bg-slate-800"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className={action.inlineToggleOption}>
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={!!step.elevate}
                          onChange={(e) => updateUninstallStep(step.key, 'elevate', e.target.checked)}
                        />
                        <span>管理者権限で実行する</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!installer.uninstallSteps.length && (
          <div className={surface.dashedPlaceholder}>
            <span className="text-xs">ステップを追加してアンインストール手順を定義してください</span>
          </div>
        )}
      </div>
    </div>
  );
}
