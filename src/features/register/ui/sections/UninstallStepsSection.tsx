/**
 * アンインストール手順コンポーネント
 */
import React from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { UNINSTALL_ACTION_OPTIONS } from '../../model/form';
import type { PackageInstallerSectionProps } from '../types';
import ActionDropdown from '../components/ActionDropdown';
import DeleteButton from '../components/DeleteButton';

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">アンインストール手順</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={addUninstallStep}
        >
          <Plus size={14} />
          <span>ステップを追加</span>
        </button>
      </div>
      <div className="space-y-3" ref={uninstallListRef}>
        {installer.uninstallSteps.map((step, idx) => {
          const order = idx + 1;
          return (
            <div
              key={step.key}
              className="step-card group relative space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {order}
                  </span>
                  <button
                    type="button"
                    className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
                    onPointerDown={(e) => startHandleDrag('uninstall', idx, e)}
                    aria-label="ドラッグして並び替え"
                  >
                    <GripVertical size={16} />
                  </button>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <ActionDropdown
                    value={step.action}
                    onChange={(val) => updateUninstallStep(step.key, 'action', val)}
                    options={UNINSTALL_ACTION_OPTIONS}
                    ariaLabel="ステップの種類を選択"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <DeleteButton onClick={() => removeUninstallStep(step.key)} ariaLabel="ステップを削除" />
                </div>
              </div>
              <div className="grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 md:grid-cols-2">
                <div className="space-y-1">
                  <label
                    className="text-xs font-medium text-slate-600 dark:text-slate-400"
                    htmlFor={`uninstall-${step.key}-path`}
                  >
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
                      <label
                        className="text-xs font-medium text-slate-600 dark:text-slate-400"
                        htmlFor={`uninstall-${step.key}-args`}
                      >
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
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
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
          <div className="flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-xs">ステップを追加してアンインストール手順を定義してください</span>
          </div>
        )}
      </div>
    </div>
  );
}
