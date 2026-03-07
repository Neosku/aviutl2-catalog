import { useEffect } from 'react';
import FeedbackSuccessDialog from './components/FeedbackSuccessDialog';
import useFeedbackAttachments from './hooks/useFeedbackAttachments';
import useFeedbackDiagnostics from './hooks/useFeedbackDiagnostics';
import useFeedbackForms from './hooks/useFeedbackForms';
import useFeedbackMode from './hooks/useFeedbackMode';
import useFeedbackSubmit from './hooks/useFeedbackSubmit';
import BugReportFormSection from './sections/BugReportFormSection';
import FeedbackErrorSection from './sections/FeedbackErrorSection';
import FeedbackHeaderSection from './sections/FeedbackHeaderSection';
import FeedbackModeTabs from './sections/FeedbackModeTabs';
import FeedbackSubmitBar from './sections/FeedbackSubmitBar';
import InquiryFormSection from './sections/InquiryFormSection';
import { page, surface } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

export default function FeedbackPage() {
  const submitEndpoint = (import.meta.env.VITE_SUBMIT_ENDPOINT || '').trim();
  const { mode, onModeChange } = useFeedbackMode();
  const { bug, inquiry, onBugChange, onInquiryChange } = useFeedbackForms();
  const { attachments, onFilesChange, onRemoveAttachment } = useFeedbackAttachments();
  const diagnostics = useFeedbackDiagnostics(mode);
  const submit = useFeedbackSubmit({
    mode,
    submitEndpoint,
    bug,
    inquiry,
    attachments,
    device: diagnostics.device,
    installedPackages: diagnostics.installedPackages,
    appLog: diagnostics.appLog,
    appVersion: diagnostics.appVersion,
  });

  useEffect(() => {
    document.body.classList.add('route-submit');
    return () => {
      document.body.classList.remove('route-submit');
    };
  }, []);

  const successPrimaryText = submit.successDialog.message || '送信が完了しました。';

  return (
    <div className={cn(page.container3xl, page.selectNone, page.enterFromBottom, 'space-y-8')}>
      <FeedbackSuccessDialog
        dialog={submit.successDialog}
        primaryText={successPrimaryText}
        onClose={submit.closeSuccessDialog}
      />
      <FeedbackHeaderSection />
      <FeedbackErrorSection message={submit.error} />

      <section className={surface.panelOverflow}>
        <FeedbackModeTabs mode={mode} onModeChange={onModeChange} />
        <div className="p-6 pt-2">
          <form className="space-y-6" onSubmit={submit.onSubmit}>
            {mode === 'bug' ? (
              <BugReportFormSection
                bug={bug}
                loadingDiag={diagnostics.loading}
                appVersion={diagnostics.appVersion}
                pluginsCount={diagnostics.installedPackages.length}
                device={diagnostics.device}
                appLog={diagnostics.appLog}
                attachments={attachments}
                onBugChange={onBugChange}
                onFilesChange={onFilesChange}
                onRemoveAttachment={onRemoveAttachment}
              />
            ) : null}
            {mode === 'inquiry' ? (
              <InquiryFormSection
                inquiry={inquiry}
                attachments={attachments}
                onInquiryChange={onInquiryChange}
                onFilesChange={onFilesChange}
                onRemoveAttachment={onRemoveAttachment}
              />
            ) : null}
            <FeedbackSubmitBar submitting={submit.submitting} />
          </form>
        </div>
      </section>
    </div>
  );
}
