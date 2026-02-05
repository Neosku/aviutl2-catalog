/**
 * パッケージ登録画面のメインコンポーネント
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getSettings } from '../../../utils/index.js';
import { PACKAGE_GUIDE_FALLBACK_URL, createEmptyPackageForm } from '../model/form';
import type { RegisterPackageForm } from '../model/types';
import type { DragHandleState, RegisterSuccessDialogState } from './types';
import useRegisterCatalogState from './hooks/useRegisterCatalogState';
import useRegisterDescriptionState from './hooks/useRegisterDescriptionState';
import useRegisterInstallerLicenseHandlers from './hooks/useRegisterInstallerLicenseHandlers';
import useRegisterStepDragHandlers from './hooks/useRegisterStepDragHandlers';
import useRegisterSubmitHandler from './hooks/useRegisterSubmitHandler';
import useRegisterTestState from './hooks/useRegisterTestState';
import useRegisterVersionImageHandlers from './hooks/useRegisterVersionImageHandlers';
import RegisterFormLayout from './layouts/RegisterFormLayout';
import { RegisterSuccessDialog } from './sections';

export default function Register() {
  const submitEndpoint = (import.meta.env.VITE_SUBMIT_ENDPOINT || '').trim();
  const packageGuideUrl = (import.meta.env.VITE_PACKAGE_GUIDE_URL || PACKAGE_GUIDE_FALLBACK_URL).trim();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewDarkMode, setPreviewDarkMode] = useState(false);
  const [packageForm, setPackageForm] = useState<RegisterPackageForm>(createEmptyPackageForm());
  const [packageSender, setPackageSender] = useState('');
  const [descriptionTab, setDescriptionTab] = useState('edit');
  const [expandedVersionKeys, setExpandedVersionKeys] = useState<Set<string>>(() => new Set());
  const [successDialog, setSuccessDialog] = useState<RegisterSuccessDialogState>({
    open: false,
    message: '',
    url: '',
    packageName: '',
    packageAction: '',
    packageId: '',
  });

  const versionDateRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const installListRef = useRef<HTMLDivElement | null>(null);
  const uninstallListRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<DragHandleState>({ active: false, type: '', index: -1 });

  const catalog = useRegisterCatalogState({
    setPackageForm,
    setDescriptionTab,
    setExpandedVersionKeys,
    setError,
  });

  const description = useRegisterDescriptionState({
    packageForm,
    catalogBaseUrl: catalog.catalogBaseUrl,
    descriptionTab,
    setPackageForm,
  });

  const formHandlers = useRegisterInstallerLicenseHandlers({
    setPackageForm,
    setExpandedVersionKeys,
  });

  const versionImageHandlers = useRegisterVersionImageHandlers({
    setPackageForm,
    setExpandedVersionKeys,
    versionDateRefs,
    setError,
  });

  const dragHandlers = useRegisterStepDragHandlers({
    dragHandleRef,
    installListRef,
    uninstallListRef,
    reorderSteps: formHandlers.reorderSteps,
  });

  const testState = useRegisterTestState({
    packageForm,
    selectedPackageId: catalog.selectedPackageId,
  });

  const submitHandlers = useRegisterSubmitHandler({
    packageForm,
    catalogItems: catalog.catalogItems,
    tagListRef: catalog.tagListRef,
    packageSender,
    submitEndpoint,
    setError,
    setSubmitting,
    setCatalogItems: catalog.setCatalogItems,
    setSelectedPackageId: catalog.setSelectedPackageId,
    setSuccessDialog,
  });

  useEffect(() => {
    document.body.classList.add('route-register');
    return () => {
      document.body.classList.remove('route-register');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await getSettings();
        if (cancelled) return;
        const theme = settings?.theme || 'darkmode';
        setPreviewDarkMode(theme !== 'lightmode');
      } catch {
        // ignore theme load errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setExpandedVersionKeys((prev) => {
      const versionKeys = new Set(packageForm.versions.map((ver) => ver.key));
      const next = new Set<string>();
      let changed = false;
      prev.forEach((key) => {
        if (versionKeys.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      });
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [packageForm.versions]);

  const closeSuccessDialog = useCallback(() => {
    setSuccessDialog({ open: false, message: '', url: '', packageName: '', packageAction: '', packageId: '' });
  }, []);

  const togglePreviewDarkMode = useCallback(() => {
    setPreviewDarkMode((prev) => !prev);
  }, []);

  const successPrimaryText = successDialog.packageName
    ? `${successDialog.packageAction || '送信完了'}: ${successDialog.packageName}`
    : successDialog.message || '送信が完了しました。';
  const successSupportText = successDialog.packageName && successDialog.message ? successDialog.message : '';

  return (
    <div className="mx-auto max-w-7xl px-0 pb-0">
      <RegisterSuccessDialog
        dialog={successDialog}
        primaryText={successPrimaryText}
        supportText={successSupportText}
        onClose={closeSuccessDialog}
      />
      <RegisterFormLayout
        title="パッケージ登録"
        error={error}
        onSubmit={submitHandlers.handleSubmit}
        sidebar={{
          packageSearch: catalog.packageSearch,
          catalogLoading: catalog.catalogLoading,
          catalogLoaded: catalog.catalogLoaded,
          filteredPackages: catalog.filteredPackages,
          selectedPackageId: catalog.selectedPackageId,
          onPackageSearchChange: catalog.handlePackageSearchChange,
          onSelectPackage: catalog.handleSelectPackage,
          onStartNewPackage: catalog.handleStartNewPackage,
        }}
        meta={{
          packageForm,
          initialTags: catalog.initialTags,
          tagCandidates: catalog.tagCandidates,
          onUpdatePackageField: formHandlers.updatePackageField,
          onTagsChange: catalog.handleTagsChange,
        }}
        description={{
          packageForm,
          descriptionTab,
          descriptionLoading: description.descriptionLoading,
          descriptionPreviewHtml: description.descriptionPreviewHtml,
          isExternalDescription: description.isExternalDescription,
          hasExternalDescriptionUrl: description.hasExternalDescriptionUrl,
          isExternalDescriptionLoaded: description.isExternalDescriptionLoaded,
          externalDescriptionStatus: description.externalDescriptionStatus,
          onUpdatePackageField: formHandlers.updatePackageField,
          onSetDescriptionTab: setDescriptionTab,
        }}
        license={{
          license: packageForm.licenses[0],
          onUpdateLicenseField: formHandlers.updateLicenseField,
          onToggleTemplate: formHandlers.toggleLicenseTemplate,
          onUpdateCopyright: formHandlers.updateCopyright,
        }}
        images={{
          images: packageForm.images,
          packageId: packageForm.id,
          onThumbnailChange: versionImageHandlers.handleThumbnailChange,
          onRemoveThumbnail: versionImageHandlers.handleRemoveThumbnail,
          onAddInfoImages: versionImageHandlers.handleAddInfoImages,
          onRemoveInfoImage: versionImageHandlers.handleRemoveInfoImage,
        }}
        installer={{
          installer: packageForm.installer,
          installListRef,
          uninstallListRef,
          addInstallStep: formHandlers.addInstallStep,
          addUninstallStep: formHandlers.addUninstallStep,
          removeInstallStep: formHandlers.removeInstallStep,
          removeUninstallStep: formHandlers.removeUninstallStep,
          startHandleDrag: dragHandlers.startHandleDrag,
          updateInstallStep: formHandlers.updateInstallStep,
          updateInstallerField: formHandlers.updateInstallerField,
          updateUninstallStep: formHandlers.updateUninstallStep,
        }}
        versions={{
          versions: packageForm.versions,
          expandedVersionKeys,
          toggleVersionOpen: versionImageHandlers.toggleVersionOpen,
          removeVersion: versionImageHandlers.removeVersion,
          updateVersionField: versionImageHandlers.updateVersionField,
          addVersion: versionImageHandlers.addVersion,
          addVersionFile: versionImageHandlers.addVersionFile,
          removeVersionFile: versionImageHandlers.removeVersionFile,
          updateVersionFile: versionImageHandlers.updateVersionFile,
          chooseFileForHash: versionImageHandlers.chooseFileForHash,
          openDatePicker: versionImageHandlers.openDatePicker,
          versionDateRefs,
        }}
        preview={{
          packageForm,
          currentTags: catalog.currentTags,
          previewDarkMode,
          onTogglePreviewDarkMode: togglePreviewDarkMode,
        }}
        tests={{
          installerTestRunning: testState.installerTestRunning,
          installerTestValidation: testState.installerTestValidation,
          installerTestRatio: testState.installerTestRatio,
          installerTestPhase: testState.installerTestPhase,
          installerTestTone: testState.installerTestTone,
          installerTestLabel: testState.installerTestLabel,
          installerTestPercent: testState.installerTestPercent,
          installerTestDetectedVersion: testState.installerTestDetectedVersion,
          installerTestError: testState.installerTestError,
          uninstallerTestRunning: testState.uninstallerTestRunning,
          uninstallerTestValidation: testState.uninstallerTestValidation,
          uninstallerTestRatio: testState.uninstallerTestRatio,
          uninstallerTestPhase: testState.uninstallerTestPhase,
          uninstallerTestTone: testState.uninstallerTestTone,
          uninstallerTestLabel: testState.uninstallerTestLabel,
          uninstallerTestPercent: testState.uninstallerTestPercent,
          uninstallerTestError: testState.uninstallerTestError,
          onInstallerTest: testState.handleInstallerTest,
          onUninstallerTest: testState.handleUninstallerTest,
        }}
        submitBar={{
          packageGuideUrl,
          packageSender,
          submitting,
          onPackageSenderChange: setPackageSender,
        }}
      />
    </div>
  );
}
