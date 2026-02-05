/**
 * インストール手順コンポーネント
 */
import React from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { ACTION_LABELS, INSTALL_ACTION_OPTIONS, SPECIAL_INSTALL_ACTIONS } from '../../model/form';
import type { PackageInstallerSectionProps } from '../types';
import ActionDropdown from '../components/ActionDropdown';
import DeleteButton from '../components/DeleteButton';

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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">インストール手順</h3>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={addInstallStep}
        >
          <Plus size={14} />
          <span>ステップを追加</span>
        </button>
      </div>
      <div className="space-y-3" ref={installListRef}>
        {installer.installSteps.map((step, idx) => {
          const order = idx + 1;
          const isSpecialAction = SPECIAL_INSTALL_ACTIONS.includes(step.action);
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
                  {!isSpecialAction && (
                    <button
                      type="button"
                      className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
                      onPointerDown={(e) => startHandleDrag('install', idx, e)}
                      aria-label="ドラッグして並び替え"
                    >
                      <GripVertical size={16} />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-[120px]">
                  {isSpecialAction ? (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {ACTION_LABELS[step.action] || step.action}
                      <span className="ml-auto text-xs font-normal text-slate-400">固定ステップ</span>
                    </div>
                  ) : (
                    <ActionDropdown
                      value={step.action}
                      onChange={(val) => updateInstallStep(step.key, 'action', val)}
                      options={INSTALL_ACTION_OPTIONS}
                      ariaLabel="ステップの種類を選択"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isSpecialAction && (
                    <DeleteButton onClick={() => removeInstallStep(step.key)} ariaLabel="ステップを削除" />
                  )}
                </div>
              </div>
              {!isSpecialAction && step.action === 'run' && (
                <div className="grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 md:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      className="text-xs font-medium text-slate-600 dark:text-slate-400"
                      htmlFor={`install-${step.key}-path`}
                    >
                      実行パス
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
                    <label
                      className="text-xs font-medium text-slate-600 dark:text-slate-400"
                      htmlFor={`install-${step.key}-args`}
                    >
                      引数 (カンマ区切り)
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
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={!!step.elevate}
                        onChange={(e) => updateInstallStep(step.key, 'elevate', e.target.checked)}
                      />
                      <span>管理者権限で実行する</span>
                    </label>
                  </div>
                </div>
              )}
              {!isSpecialAction && step.action === 'copy' && (
                <div className="grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 md:grid-cols-2">
                  <div className="space-y-1">
                    <label
                      className="text-xs font-medium text-slate-600 dark:text-slate-400"
                      htmlFor={`install-${step.key}-from`}
                    >
                      コピー元
                    </label>
                    <input
                      id={`install-${step.key}-from`}
                      value={step.from}
                      onChange={(e) => updateInstallStep(step.key, 'from', e.target.value)}
                      placeholder="（例：{tmp}/example.auo）"
                      className="!bg-white dark:!bg-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-xs font-medium text-slate-600 dark:text-slate-400"
                      htmlFor={`install-${step.key}-to`}
                    >
                      コピー先
                    </label>
                    <input
                      id={`install-${step.key}-to`}
                      value={step.to}
                      onChange={(e) => updateInstallStep(step.key, 'to', e.target.value)}
                      placeholder="（例：{pluginsDir}）"
                      className="!bg-white dark:!bg-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!installer.installSteps.length && (
          <div className="flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-xs">ステップを追加してインストール手順を定義してください</span>
          </div>
        )}
      </div>
    </div>
  );
}
