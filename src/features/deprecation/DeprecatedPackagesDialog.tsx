import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import ErrorDialog from '@/components/ErrorDialog';
import ProgressCircle from '@/components/ProgressCircle';
import { buildPackageDetailHref } from '@/features/package/model/helpers';
import { layout, overlay, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';
import { useCatalog, useCatalogDispatch, type CatalogStorePackage } from '@/utils/catalogStore';
import { resolveInstallableCatalogItem } from '@/utils/catalogInstallItem';
import {
  loadDismissedDeprecatedPackageIds,
  persistDismissedDeprecatedPackages,
} from '@/utils/deprecated-package-notice';
import { runPackageRemoveAction } from '@/utils/installer';
import { toErrorMessage } from '@/features/updates/model/helpers';

export default function DeprecatedPackagesDialog() {
  const { t } = useTranslation(['package', 'common', 'settings']);
  const { items, loading } = useCatalog();
  const dispatch = useCatalogDispatch();
  const [dismissed, setDismissed] = useState(false);
  const [dismissedIdsLoaded, setDismissedIdsLoaded] = useState(false);
  const [dismissedIdSet, setDismissedIdSet] = useState<ReadonlySet<string>>(() => new Set());
  const [busyId, setBusyId] = useState('');
  const [dismissBusy, setDismissBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ids = await loadDismissedDeprecatedPackageIds();
        if (cancelled) return;
        setDismissedIdSet(new Set(ids));
        setDismissedIdsLoaded(true);
      } catch {
        if (!cancelled) {
          setDismissedIdsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const deprecatedInstalledItems = useMemo(
    () => items.filter((item) => item.installed && item.deprecation && !dismissedIdSet.has(item.id)),
    [dismissedIdSet, items],
  );
  const open = !dismissed && !loading && dismissedIdsLoaded && deprecatedInstalledItems.length > 0;

  useEffect(() => {
    if (deprecatedInstalledItems.length === 0) {
      setBusyId('');
      setError('');
    }
  }, [deprecatedInstalledItems.length]);

  const handleClose = useCallback(() => {
    if (busyId || dismissBusy) return;
    setDismissed(true);
  }, [busyId, dismissBusy]);

  const handleDismissNextTime = useCallback(async () => {
    if (busyId || dismissBusy) return;
    const ids = deprecatedInstalledItems.map((item) => item.id);
    if (ids.length === 0) {
      setDismissed(true);
      return;
    }

    setDismissBusy(true);
    setError('');
    try {
      const persistedIds = await persistDismissedDeprecatedPackages(ids);
      setDismissedIdSet(new Set(persistedIds));
      setDismissed(true);
    } catch {
      setError(t('settings:errors.saveFailed'));
    } finally {
      setDismissBusy(false);
    }
  }, [busyId, deprecatedInstalledItems, dismissBusy, t]);

  const handleRemove = useCallback(
    async (item: CatalogStorePackage) => {
      if (busyId || dismissBusy) return;
      setBusyId(item.id);
      setError('');

      try {
        const resolvedItem = (await resolveInstallableCatalogItem(item)) ?? item;
        await runPackageRemoveAction(resolvedItem, dispatch);
      } catch (removeError) {
        setError(
          t('package:errors.actionFailed', {
            action: t('package:actions.remove'),
            detail: toErrorMessage(removeError),
          }),
        );
      } finally {
        setBusyId('');
      }
    },
    [busyId, dismissBusy, dispatch, t],
  );

  if (!open && !error) {
    return null;
  }

  return (
    <>
      {open ? (
        <div className={layout.fixedCenter}>
          <button
            type="button"
            aria-label={t('common:actions.close')}
            className={overlay.backdrop}
            onClick={handleClose}
          />
          <div
            className={cn(
              surface.cardOverflow,
              'relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col shadow-xl',
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="deprecated-packages-title"
          >
            <div className={cn(layout.inlineStartGap3, surface.sectionDivider)}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-300">
                <TriangleAlert size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={text.titleLg} id="deprecated-packages-title">
                  <span className="text-yellow-700 dark:text-yellow-300">{t('package:deprecationDialog.title')}</span>
                </h3>
                <p className={cn(text.bodySmMutedAlt, 'mt-1 max-w-xl leading-relaxed')}>
                  {t('package:deprecationDialog.description')}
                </p>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {deprecatedInstalledItems.map((item) => {
                  const removing = busyId === item.id;
                  const reason = item.deprecation?.message || '';
                  return (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-yellow-100/70 dark:border-slate-800 dark:bg-slate-900 dark:ring-yellow-900/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <Link
                          to={buildPackageDetailHref(item.id, '')}
                          className="inline-block max-w-full align-top font-bold text-slate-900 underline-offset-2 transition-colors hover:text-blue-600 hover:underline dark:text-slate-100 dark:hover:text-blue-400"
                          onClick={handleClose}
                        >
                          <span className="block max-w-full truncate">{item.name}</span>
                        </Link>
                        {reason ? (
                          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{reason}</p>
                        ) : null}
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        className="justify-self-start sm:justify-self-end"
                        onClick={() => void handleRemove(item)}
                        disabled={Boolean(busyId) || dismissBusy}
                        type="button"
                      >
                        {removing ? (
                          <>
                            <ProgressCircle value={0} size={16} strokeWidth={3} />
                            {t('package:actions.removing')}
                          </>
                        ) : (
                          <>
                            <Trash2 size={16} />
                            {t('package:actions.remove')}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={layout.footerEnd}>
              <Button
                variant="secondary"
                onClick={() => void handleDismissNextTime()}
                disabled={Boolean(busyId) || dismissBusy}
                type="button"
              >
                {dismissBusy ? t('common:status.processing') : t('package:deprecationDialog.dismissNextTime')}
              </Button>
              <Button variant="primary" onClick={handleClose} disabled={Boolean(busyId) || dismissBusy} type="button">
                {t('common:actions.close')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <ErrorDialog open={Boolean(error)} message={error} onClose={() => setError('')} />
    </>
  );
}
