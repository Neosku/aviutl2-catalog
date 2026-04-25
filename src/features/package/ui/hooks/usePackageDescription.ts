import { useTranslation } from 'react-i18next';
import usePackageMarkdown from './usePackageMarkdown';

interface UsePackageDescriptionParams {
  descriptionSource: string;
  baseUrl: string;
}

export default function usePackageDescription({
  descriptionSource,
  baseUrl,
}: UsePackageDescriptionParams) {
  const { t } = useTranslation('package');
  const { html, loading, error } = usePackageMarkdown({
    markdownSource: descriptionSource,
    baseUrl,
    loadFailedMessage: t('descriptionErrors.loadFailed'),
  });

  return {
    descriptionHtml: html,
    descriptionLoading: loading,
    descriptionError: error,
  };
}
