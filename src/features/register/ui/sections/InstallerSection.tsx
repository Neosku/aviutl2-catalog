/**
 * インストーラーのコンテナセクション。
 */
import React, { memo } from 'react';
import type { PackageInstallerSectionProps } from '../types';
import InstallStepsSection from './InstallStepsSection';
import InstallerSourceSection from './InstallerSourceSection';
import UninstallStepsSection from './UninstallStepsSection';

const PackageInstallerSection = memo(
  function PackageInstallerSection(props: PackageInstallerSectionProps) {
    const {
      installer,
      installListRef,
      uninstallListRef,
      addInstallStep,
      addUninstallStep,
      removeInstallStep,
      removeUninstallStep,
      startHandleDrag,
      updateInstallStep,
      updateInstallerField,
      updateUninstallStep,
    } = props;

    return (
      <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">インストーラ</h2>
        </div>

        <InstallerSourceSection installer={installer} updateInstallerField={updateInstallerField} />

        <InstallStepsSection
          installer={installer}
          installListRef={installListRef}
          addInstallStep={addInstallStep}
          removeInstallStep={removeInstallStep}
          startHandleDrag={startHandleDrag}
          updateInstallStep={updateInstallStep}
        />

        <UninstallStepsSection
          installer={installer}
          uninstallListRef={uninstallListRef}
          addUninstallStep={addUninstallStep}
          removeUninstallStep={removeUninstallStep}
          startHandleDrag={startHandleDrag}
          updateUninstallStep={updateUninstallStep}
        />
      </section>
    );
  },
  (prev: Readonly<PackageInstallerSectionProps>, next: Readonly<PackageInstallerSectionProps>) =>
    prev.installer === next.installer &&
    prev.installListRef === next.installListRef &&
    prev.uninstallListRef === next.uninstallListRef &&
    prev.addInstallStep === next.addInstallStep &&
    prev.addUninstallStep === next.addUninstallStep &&
    prev.removeInstallStep === next.removeInstallStep &&
    prev.removeUninstallStep === next.removeUninstallStep &&
    prev.startHandleDrag === next.startHandleDrag &&
    prev.updateInstallStep === next.updateInstallStep &&
    prev.updateInstallerField === next.updateInstallerField &&
    prev.updateUninstallStep === next.updateUninstallStep,
);

export default PackageInstallerSection;
