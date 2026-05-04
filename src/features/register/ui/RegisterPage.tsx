/**
 * パッケージ登録画面のメインコンポーネント
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSettings } from '@/utils/settings';
import { saveRegisterDraftFromCatalogEntry } from '../model/draft';
import { PACKAGE_GUIDE_FALLBACK_URL, createEmptyPackageForm } from '../model/form';
import { getErrorMessage } from '../model/helpers';
import type { RegisterPackageForm } from '../model/types';
import type { DragHandleState, RegisterMarkdownTab, RegisterSuccessDialogState } from './types';
import useRegisterBatchSubmit from './hooks/useRegisterBatchSubmit';
import useRegisterCatalogState from './hooks/useRegisterCatalogState';
import useRegisterDescriptionState from './hooks/useRegisterDescriptionState';
import useRegisterDraftState from './hooks/useRegisterDraftState';
import useRegisterImageHandlers from './hooks/useRegisterImageHandlers';
import useRegisterInstallerLicenseHandlers from './hooks/useRegisterInstallerLicenseHandlers';
import useRegisterPackageFileImport from './hooks/useRegisterPackageFileImport';
import useRegisterStepDragHandlers from './hooks/useRegisterStepDragHandlers';
import useRegisterSubmitHandler from './hooks/useRegisterSubmitHandler';
import useRegisterTestState from './hooks/useRegisterTestState';
import useRegisterVersionHandlers from './hooks/useRegisterVersionHandlers';
import RegisterFormLayout from './layouts/RegisterFormLayout';
import { RegisterJsonImportDialog, RegisterSuccessDialog } from './sections';

export default function Register() {
  const { t } = useTranslation(['register', 'common']);
  const submitEndpoint = (import.meta.env.VITE_SUBMIT_ENDPOINT || '').trim();
  const packageGuideUrl = (import.meta.env.VITE_PACKAGE_GUIDE_URL || PACKAGE_GUIDE_FALLBACK_URL).trim();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewDarkMode, setPreviewDarkMode] = useState(false);
  const [packageForm, setPackageForm] = useState<RegisterPackageForm>(createEmptyPackageForm());
  const [packageSender, setPackageSender] = useState('');
  const [userEditToken, setUserEditToken] = useState(0);
  const [descriptionTab, setDescriptionTab] = useState<RegisterMarkdownTab>('edit');
  const [expandedVersionKeys, setExpandedVersionKeys] = useState<Set<string>>(() => new Set());
  const [successDialog, setSuccessDialog] = useState<RegisterSuccessDialogState>({
    open: false,
    message: '',
    url: '',
    packageName: '',
    packageAction: '',
  });
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonDialogText, setJsonDialogText] = useState('');
  const [jsonDialogError, setJsonDialogError] = useState('');

  const versionDateRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const installListRef = useRef<HTMLDivElement | null>(null);
  const uninstallListRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<DragHandleState>({ active: false, type: '', index: -1 });

  const markUserEdit = useCallback(() => {
    setUserEditToken((prev) => prev + 1);
  }, []);

  const catalog = useRegisterCatalogState({
    setPackageForm,
    setDescriptionTab,
    setExpandedVersionKeys,
    setError,
    onUserEdit: markUserEdit,
  });

  const description = useRegisterDescriptionState({
    packageForm,
    catalogBaseUrl: catalog.catalogBaseUrl,
    descriptionTab,
    setPackageForm,
  });

  const formHandlers = useRegisterInstallerLicenseHandlers({
    setPackageForm,
    onUserEdit: markUserEdit,
  });

  const packageFileImport = useRegisterPackageFileImport({
    replaceInstallSteps: formHandlers.replaceInstallSteps,
    replaceUninstallSteps: formHandlers.replaceUninstallSteps,
  });

  const versionHandlers = useRegisterVersionHandlers({
    setPackageForm,
    setExpandedVersionKeys,
    versionDateRefs,
    setError,
    onUserEdit: markUserEdit,
  });
  const imageHandlers = useRegisterImageHandlers({
    setPackageForm,
    onUserEdit: markUserEdit,
  });

  const dragHandlers = useRegisterStepDragHandlers({
    dragHandleRef,
    installListRef,
    uninstallListRef,
    reorderSteps: formHandlers.reorderSteps,
  });

  const submitHandlers = useRegisterSubmitHandler({
    submitEndpoint,
    setCatalogItems: catalog.setCatalogItems,
    setSelectedPackageId: catalog.setSelectedPackageId,
    setSuccessDialog,
  });

  const getCatalogPackageById = useCallback(
    (packageId: string) => catalog.catalogItems.find((item) => item.id === packageId) || null,
    [catalog.catalogItems],
  );

  const draftState = useRegisterDraftState({
    packageForm,
    packageSender,
    currentTags: catalog.currentTags,
    userEditToken,
    selectedPackageId: catalog.selectedPackageId,
    catalogItems: catalog.catalogItems,
    setSelectedPackageId: catalog.setSelectedPackageId,
    getCatalogPackageById,
    onSelectCatalogPackage: catalog.handleSelectPackage,
    onStartCatalogNewPackage: catalog.handleStartNewPackage,
    applyTagList: catalog.applyTagList,
    setPackageForm,
    setPackageSender,
    setDescriptionTab,
    setExpandedVersionKeys,
    setError,
  });

  const testState = useRegisterTestState({
    packageForm,
    selectedPackageId: catalog.selectedPackageId,
    catalogItems: catalog.catalogItems,
    flushDraftBeforeTest: draftState.flushAutoSaveNow,
    onTestPassed: draftState.markCurrentDraftTestPassed,
  });

  const batchSubmit = useRegisterBatchSubmit({
    catalogItems: catalog.catalogItems,
    setCatalogItems: catalog.setCatalogItems,
    submitPackage: submitHandlers.submitPackage,
    flushAutoSaveNow: draftState.flushAutoSaveNow,
    reloadDraftPackages: draftState.reloadDraftPackages,
    setError,
    setSubmitting,
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

  useEffect(() => {
    packageFileImport.resetPackageFileImport();
  }, [catalog.selectedPackageId, packageFileImport.resetPackageFileImport]);

  const closeSuccessDialog = useCallback(() => {
    setSuccessDialog({ open: false, message: '', url: '', packageName: '', packageAction: '' });
  }, []);

  const togglePreviewDarkMode = useCallback(() => {
    setPreviewDarkMode((prev) => !prev);
  }, []);

  const openJsonDialog = useCallback(() => {
    setJsonDialogError('');
    setJsonDialogOpen(true);
  }, []);

  const closeJsonDialog = useCallback(() => {
    setJsonDialogOpen(false);
    setJsonDialogError('');
  }, []);

  const applyCatalogJsonPatch = useCallback(async () => {
    try {
      const { changedItems } = catalog.applyCatalogJsonPatch(jsonDialogText);
      if (changedItems.length === 0) {
        setJsonDialogError(t('page.jsonNoChanges'));
        return;
      }

      changedItems.forEach((item) => {
        saveRegisterDraftFromCatalogEntry({
          item,
          catalogBaseUrl: catalog.catalogBaseUrl,
          packageSender,
        });
      });
      draftState.reloadDraftPackages();
      const selectedPackageId = String(catalog.selectedPackageId || '').trim();
      if (selectedPackageId && changedItems.some((item) => item.id === selectedPackageId)) {
        await draftState.reapplyDraftForPackage(selectedPackageId);
      }
      closeJsonDialog();
    } catch (e: unknown) {
      setJsonDialogError(getErrorMessage(e));
    }
  }, [
    catalog.applyCatalogJsonPatch,
    catalog.catalogBaseUrl,
    catalog.selectedPackageId,
    closeJsonDialog,
    draftState.reapplyDraftForPackage,
    draftState.reloadDraftPackages,
    jsonDialogText,
    packageSender,
    t,
  ]);

  const successPrimaryText = successDialog.packageName
    ? t('page.successPrimary', {
        action: successDialog.packageAction || t('common:submit.completeTitle'),
        name: successDialog.packageName,
      })
    : successDialog.message || t('common:submit.successDefault');
  const successSupportText = successDialog.packageName && successDialog.message ? successDialog.message : '';
  const handlePackageSenderChange = useCallback(
    (value: string) => {
      markUserEdit();
      setPackageSender(value);
    },
    [markUserEdit],
  );
  const sidebarProps = useMemo(
    () => ({
      packageSearch: catalog.packageSearch,
      catalogLoadState: catalog.catalogLoadState,
      filteredPackages: catalog.filteredPackages,
      draftPackages: draftState.pendingDraftPackages,
      selectedPackageId: catalog.selectedPackageId,
      onPackageSearchChange: catalog.handlePackageSearchChange,
      onSelectPackage: draftState.handleSelectPackage,
      onStartNewPackage: draftState.handleStartNewPackage,
      onOpenDraftPackage: draftState.handleOpenDraftPackage,
      onDeleteDraftPackage: draftState.handleDeleteDraftPackage,
    }),
    [
      catalog.packageSearch,
      catalog.catalogLoadState,
      catalog.filteredPackages,
      draftState.pendingDraftPackages,
      catalog.selectedPackageId,
      catalog.handlePackageSearchChange,
      draftState.handleSelectPackage,
      draftState.handleStartNewPackage,
      draftState.handleOpenDraftPackage,
      draftState.handleDeleteDraftPackage,
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
    ],
  );
  const relationsProps = useMemo(
    () => ({
      packageForm,
      onUpdatePackageField: formHandlers.updatePackageField,
    }),
    [packageForm, formHandlers.updatePackageField],
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
  const changelogProps = useMemo(
    () => ({
      packageForm,
      onUpdatePackageField: formHandlers.updatePackageField,
    }),
    [packageForm, formHandlers.updatePackageField],
  );
  const noticeMarkdownProps = useMemo(
    () => ({
      packageForm,
      onUpdatePackageField: formHandlers.updatePackageField,
    }),
    [packageForm, formHandlers.updatePackageField],
  );
  const imagesProps = useMemo(
    () => ({
      images: packageForm.images,
      packageId: packageForm.id,
      onThumbnailChange: imageHandlers.handleThumbnailChange,
      onRemoveThumbnail: imageHandlers.handleRemoveThumbnail,
      onAddInfoImages: imageHandlers.handleAddInfoImages,
      onRemoveInfoImage: imageHandlers.handleRemoveInfoImage,
    }),
    [
      packageForm.images,
      packageForm.id,
      imageHandlers.handleThumbnailChange,
      imageHandlers.handleRemoveThumbnail,
      imageHandlers.handleAddInfoImages,
      imageHandlers.handleRemoveInfoImage,
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
      packageFileName: packageFileImport.selectedPackageFileName,
      packageFileSummary: packageFileImport.packageFileSummary,
      packageFileError: packageFileImport.packageFileError,
      packageFileImporting: packageFileImport.packageFileImporting,
      onSelectPackageFile: packageFileImport.handleSelectPackageFile,
    }),
    [
      packageForm.installer,
      formHandlers.addInstallStep,
      formHandlers.addUninstallStep,
      formHandlers.removeInstallStep,
      formHandlers.removeUninstallStep,
      dragHandlers.startHandleDrag,
      formHandlers.updateInstallStep,
      formHandlers.updateInstallerField,
      formHandlers.updateUninstallStep,
      packageFileImport.selectedPackageFileName,
      packageFileImport.packageFileSummary,
      packageFileImport.packageFileError,
      packageFileImport.packageFileImporting,
      packageFileImport.handleSelectPackageFile,
    ],
  );
  const versionsProps = useMemo(
    () => ({
      versions: packageForm.versions,
      expandedVersionKeys,
      toggleVersionOpen: versionHandlers.toggleVersionOpen,
      removeVersion: versionHandlers.removeVersion,
      updateVersionField: versionHandlers.updateVersionField,
      addVersion: versionHandlers.addVersion,
      addVersionFile: versionHandlers.addVersionFile,
      removeVersionFile: versionHandlers.removeVersionFile,
      updateVersionFile: versionHandlers.updateVersionFile,
      chooseFileForHash: versionHandlers.chooseFileForHash,
      openDatePicker: versionHandlers.openDatePicker,
      versionDateRefs,
    }),
    [
      packageForm.versions,
      expandedVersionKeys,
      versionHandlers.toggleVersionOpen,
      versionHandlers.removeVersion,
      versionHandlers.updateVersionField,
      versionHandlers.addVersion,
      versionHandlers.addVersionFile,
      versionHandlers.removeVersionFile,
      versionHandlers.updateVersionFile,
      versionHandlers.chooseFileForHash,
      versionHandlers.openDatePicker,
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
      testsRequired: testState.testsRequired,
      installerTestRunning: testState.installerTestRunning,
      installerTestValidation: testState.installerTestValidation,
      installerTestRatio: testState.installerTestRatio,
      installerTestPhase: testState.installerTestPhase,
      installerTestTone: testState.installerTestTone,
      installerTestLabel: testState.installerTestLabel,
      installerTestPercent: testState.installerTestPercent,
      installerTestDetectedVersion: testState.installerTestDetectedVersion,
      installerTestError: testState.installerTestError,
      installerTestOperations: testState.installerTestOperations,
      uninstallerTestRunning: testState.uninstallerTestRunning,
      uninstallerTestValidation: testState.uninstallerTestValidation,
      uninstallerTestRatio: testState.uninstallerTestRatio,
      uninstallerTestPhase: testState.uninstallerTestPhase,
      uninstallerTestTone: testState.uninstallerTestTone,
      uninstallerTestLabel: testState.uninstallerTestLabel,
      uninstallerTestPercent: testState.uninstallerTestPercent,
      uninstallerTestError: testState.uninstallerTestError,
      uninstallerTestOperations: testState.uninstallerTestOperations,
      onInstallerTest: testState.handleInstallerTest,
      onUninstallerTest: testState.handleUninstallerTest,
    }),
    [
      testState.testsRequired,
      testState.installerTestRunning,
      testState.installerTestValidation,
      testState.installerTestRatio,
      testState.installerTestPhase,
      testState.installerTestTone,
      testState.installerTestLabel,
      testState.installerTestPercent,
      testState.installerTestDetectedVersion,
      testState.installerTestError,
      testState.installerTestOperations,
      testState.uninstallerTestRunning,
      testState.uninstallerTestValidation,
      testState.uninstallerTestRatio,
      testState.uninstallerTestPhase,
      testState.uninstallerTestTone,
      testState.uninstallerTestLabel,
      testState.uninstallerTestPercent,
      testState.uninstallerTestError,
      testState.uninstallerTestOperations,
      testState.handleInstallerTest,
      testState.handleUninstallerTest,
    ],
  );
  const submitBarProps = useMemo(
    () => ({
      packageGuideUrl,
      packageSender,
      submitting,
      pendingSubmitCount: draftState.pendingSubmitCount,
      blockedSubmitCount: draftState.blockedSubmitCount,
      submittingLabel: batchSubmit.submitProgressText
        ? `${t('submitBar.submitting')} (${batchSubmit.submitProgressText})`
        : t('submitBar.submitting'),
      onOpenJsonImport: openJsonDialog,
      onPackageSenderChange: handlePackageSenderChange,
    }),
    [
      packageGuideUrl,
      packageSender,
      submitting,
      draftState.pendingSubmitCount,
      draftState.blockedSubmitCount,
      batchSubmit.submitProgressText,
      openJsonDialog,
      handlePackageSenderChange,
    ],
  );

  return (
    <div className="mx-auto max-w-7xl px-0 py-6">
      <RegisterSuccessDialog
        dialog={successDialog}
        primaryText={successPrimaryText}
        supportText={successSupportText}
        onClose={closeSuccessDialog}
      />
      <RegisterJsonImportDialog
        open={jsonDialogOpen}
        value={jsonDialogText}
        error={jsonDialogError}
        onChange={setJsonDialogText}
        onClose={closeJsonDialog}
        onApply={applyCatalogJsonPatch}
      />
      <RegisterFormLayout
        error={error}
        onSubmit={batchSubmit.handleSubmitAllDrafts}
        sidebar={sidebarProps}
        meta={metaProps}
        relations={relationsProps}
        description={descriptionProps}
        license={licenseProps}
        noticeMarkdown={noticeMarkdownProps}
        images={imagesProps}
        installer={installerProps}
        versions={versionsProps}
        changelog={changelogProps}
        preview={previewProps}
        tests={testsProps}
        submitBar={submitBarProps}
      />
    </div>
  );
}
