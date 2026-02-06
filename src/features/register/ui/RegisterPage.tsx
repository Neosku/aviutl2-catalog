/**
 * パッケージ登録画面のメインコンポーネント
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const sidebarProps = useMemo(
    () => ({
      packageSearch: catalog.packageSearch,
      catalogLoading: catalog.catalogLoading,
      catalogLoaded: catalog.catalogLoaded,
      filteredPackages: catalog.filteredPackages,
      selectedPackageId: catalog.selectedPackageId,
      onPackageSearchChange: catalog.handlePackageSearchChange,
      onSelectPackage: catalog.handleSelectPackage,
      onStartNewPackage: catalog.handleStartNewPackage,
    }),
    [
      catalog.packageSearch,
      catalog.catalogLoading,
      catalog.catalogLoaded,
      catalog.filteredPackages,
      catalog.selectedPackageId,
      catalog.handlePackageSearchChange,
      catalog.handleSelectPackage,
      catalog.handleStartNewPackage,
    ],
  );
  const metaProps = useMemo(
    () => ({
      packageForm,
      initialTags: catalog.initialTags,
      tagCandidates: catalog.tagCandidates,
      onUpdatePackageField: formHandlers.updatePackageField,
      onTagsChange: catalog.handleTagsChange,
    }),
    [
      packageForm,
      catalog.initialTags,
      catalog.tagCandidates,
      formHandlers.updatePackageField,
      catalog.handleTagsChange,
    ],
  );
  const descriptionProps = useMemo(
    () => ({
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
    }),
    [
      packageForm,
      descriptionTab,
      description.descriptionLoading,
      description.descriptionPreviewHtml,
      description.isExternalDescription,
      description.hasExternalDescriptionUrl,
      description.isExternalDescriptionLoaded,
      description.externalDescriptionStatus,
      formHandlers.updatePackageField,
      setDescriptionTab,
    ],
  );
  const licenseProps = useMemo(
    () => ({
      license: packageForm.licenses[0],
      onUpdateLicenseField: formHandlers.updateLicenseField,
      onToggleTemplate: formHandlers.toggleLicenseTemplate,
      onUpdateCopyright: formHandlers.updateCopyright,
    }),
    [
      packageForm.licenses,
      formHandlers.updateLicenseField,
      formHandlers.toggleLicenseTemplate,
      formHandlers.updateCopyright,
    ],
  );
  const imagesProps = useMemo(
    () => ({
      images: packageForm.images,
      packageId: packageForm.id,
      onThumbnailChange: versionImageHandlers.handleThumbnailChange,
      onRemoveThumbnail: versionImageHandlers.handleRemoveThumbnail,
      onAddInfoImages: versionImageHandlers.handleAddInfoImages,
      onRemoveInfoImage: versionImageHandlers.handleRemoveInfoImage,
    }),
    [
      packageForm.images,
      packageForm.id,
      versionImageHandlers.handleThumbnailChange,
      versionImageHandlers.handleRemoveThumbnail,
      versionImageHandlers.handleAddInfoImages,
      versionImageHandlers.handleRemoveInfoImage,
    ],
  );
  const installerProps = useMemo(
    () => ({
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
    }),
    [
      packageForm.installer,
      installListRef,
      uninstallListRef,
      formHandlers.addInstallStep,
      formHandlers.addUninstallStep,
      formHandlers.removeInstallStep,
      formHandlers.removeUninstallStep,
      dragHandlers.startHandleDrag,
      formHandlers.updateInstallStep,
      formHandlers.updateInstallerField,
      formHandlers.updateUninstallStep,
    ],
  );
  const versionsProps = useMemo(
    () => ({
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
    }),
    [
      packageForm.versions,
      expandedVersionKeys,
      versionImageHandlers.toggleVersionOpen,
      versionImageHandlers.removeVersion,
      versionImageHandlers.updateVersionField,
      versionImageHandlers.addVersion,
      versionImageHandlers.addVersionFile,
      versionImageHandlers.removeVersionFile,
      versionImageHandlers.updateVersionFile,
      versionImageHandlers.chooseFileForHash,
      versionImageHandlers.openDatePicker,
      versionDateRefs,
    ],
  );
  const previewProps = useMemo(
    () => ({
      packageForm,
      currentTags: catalog.currentTags,
      previewDarkMode,
      onTogglePreviewDarkMode: togglePreviewDarkMode,
    }),
    [packageForm, catalog.currentTags, previewDarkMode, togglePreviewDarkMode],
  );
  const testsProps = useMemo(
    () => ({
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
    }),
    [
      testState.installerTestRunning,
      testState.installerTestValidation,
      testState.installerTestRatio,
      testState.installerTestPhase,
      testState.installerTestTone,
      testState.installerTestLabel,
      testState.installerTestPercent,
      testState.installerTestDetectedVersion,
      testState.installerTestError,
      testState.uninstallerTestRunning,
      testState.uninstallerTestValidation,
      testState.uninstallerTestRatio,
      testState.uninstallerTestPhase,
      testState.uninstallerTestTone,
      testState.uninstallerTestLabel,
      testState.uninstallerTestPercent,
      testState.uninstallerTestError,
      testState.handleInstallerTest,
      testState.handleUninstallerTest,
    ],
  );
  const submitBarProps = useMemo(
    () => ({
      packageGuideUrl,
      packageSender,
      submitting,
      onPackageSenderChange: setPackageSender,
    }),
    [packageGuideUrl, packageSender, submitting, setPackageSender],
  );

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
        sidebar={sidebarProps}
        meta={metaProps}
        description={descriptionProps}
        license={licenseProps}
        images={imagesProps}
        installer={installerProps}
        versions={versionsProps}
        preview={previewProps}
        tests={testsProps}
        submitBar={submitBarProps}
      />
    </div>
  );
}
