import React from 'react';
import { AlertCircle } from 'lucide-react';
import TitleBar from '../../../components/TitleBar.jsx';
import UpdateDialog from '../../../components/UpdateDialog.jsx';
import { ensureInitWindowVisible } from '../model/helpers';
import StepIndicator from './components/StepIndicator';
import useInitSetupState from './hooks/useInitSetupState';
import {
  DoneSection,
  ExistingDetailsSection,
  InstallStatusSection,
  IntroSection,
  InstallDetailsSection,
  PackagesSection,
} from './sections';

ensureInitWindowVisible();

export default function InitSetupPage() {
  const state = useInitSetupState();

  return (
    <>
      <div
        className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 h-screen flex flex-col overflow-hidden font-sans select-none relative"
        data-window-label={state.label || ''}
      >
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/5 dark:bg-blue-600/5 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-400/5 dark:bg-indigo-600/5 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen animate-pulse-slow delay-1000" />

        {state.step === 'done' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none animate-pulse z-0" />
        )}

        <TitleBar />
        <StepIndicator step={state.step} installed={state.installed} />

        <main className="flex-1 overflow-hidden relative flex flex-col z-0">
          <div className="flex-1 w-full max-w-3xl mx-auto px-10 pb-8 flex flex-col h-full overflow-y-auto">
            {state.error && (
              <div className="mb-4 shrink-0 p-4 rounded-xl border border-red-200/60 bg-red-50/80 backdrop-blur-md text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="whitespace-pre-wrap flex-1 font-medium leading-relaxed">{state.error}</div>
              </div>
            )}
            {state.setupError && (
              <div className="mb-4 shrink-0 p-4 rounded-xl border border-red-200/60 bg-red-50/80 backdrop-blur-md text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="whitespace-pre-wrap flex-1 font-medium leading-relaxed">{state.setupError}</div>
              </div>
            )}

            {state.step === 'intro' && (
              <IntroSection canStart={Boolean(state.setupConfig)} onStart={() => state.setStep('installStatus')} />
            )}

            {state.step === 'installStatus' && (
              <InstallStatusSection onSelectInstalled={state.proceedInstalled} onBack={() => state.setStep('intro')} />
            )}

            {state.step === 'details' && state.installed === true && (
              <ExistingDetailsSection
                aviutlRoot={state.aviutlRoot}
                portable={state.portable}
                savingInstallDetails={state.savingInstallDetails}
                canProceed={state.canProceedDetails()}
                onAviutlRootChange={state.setAviutlRoot}
                onPortableChange={state.setPortable}
                onPickExistingDir={() => {
                  void state.pickDir('existing');
                }}
                onBack={() => state.setStep('installStatus')}
                onNext={() => {
                  void state.handleExistingDetailsNext();
                }}
              />
            )}

            {state.step === 'details' && state.installed === false && (
              <InstallDetailsSection
                installDir={state.installDir}
                portable={state.portable}
                savingInstallDetails={state.savingInstallDetails}
                canProceed={state.canProceedDetails()}
                coreProgressRatio={state.coreProgressRatio}
                onInstallDirChange={state.setInstallDir}
                onPortableChange={state.setPortable}
                onPickInstallDir={() => {
                  void state.pickDir('install');
                }}
                onBack={() => state.setStep('installStatus')}
                onNext={() => {
                  void state.handleInstallDetailsNext();
                }}
              />
            )}

            {state.step === 'packages' && (
              <PackagesSection
                requiredPackages={state.requiredPackages}
                packageVersions={state.packageVersions}
                allRequiredInstalled={state.allRequiredInstalled}
                packagesLoading={state.packagesLoading}
                packagesError={state.packagesError}
                packagesDownloadError={state.packagesDownloadError}
                bulkDownloading={state.bulkDownloading}
                onBack={() => state.setStep('details')}
                onSkip={() => state.setStep('done')}
                onInstallAndNext={() => {
                  void state.handleBulkInstallAndNext();
                }}
              />
            )}

            {state.step === 'done' && (
              <DoneSection
                busy={state.busy}
                onFinalize={() => {
                  void state.finalizeSetup();
                }}
                onBack={() => state.setStep('packages')}
              />
            )}
          </div>
        </main>
      </div>
      <UpdateDialog
        open={Boolean(state.updateInfo)}
        version={state.updateInfo?.version || ''}
        notes={state.updateInfo?.notes || ''}
        publishedOn={state.updateInfo?.publishedOn || ''}
        busy={state.updateBusy}
        error={state.updateError}
        onConfirm={state.confirmUpdate}
        onCancel={state.dismissUpdate}
      />
    </>
  );
}
