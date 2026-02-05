/**
 * インストール／削除テストの進行状態を管理する hook
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectInstalledVersionsMap, runInstallerForItem, runUninstallerForItem } from '../../../../utils/index.js';
import { buildInstallerTestItem, validateInstallerForTest, validateUninstallerForTest } from '../../model/form';
import type { RegisterPackageForm } from '../../model/types';
import type { InstallerTestItem, InstallerTestProgress } from '../types';

interface UseRegisterTestStateArgs {
  packageForm: RegisterPackageForm;
  selectedPackageId: string;
}

export default function useRegisterTestState({ packageForm, selectedPackageId }: UseRegisterTestStateArgs) {
  const [installerTestRunning, setInstallerTestRunning] = useState(false);
  const [installerTestProgress, setInstallerTestProgress] = useState<InstallerTestProgress | null>(null);
  const [installerTestError, setInstallerTestError] = useState('');
  const [installerTestDetectedVersion, setInstallerTestDetectedVersion] = useState('');
  const [uninstallerTestRunning, setUninstallerTestRunning] = useState(false);
  const [uninstallerTestError, setUninstallerTestError] = useState('');
  const [uninstallerTestDone, setUninstallerTestDone] = useState(false);
  const installerTestTokenRef = useRef(0);
  const uninstallerTestTokenRef = useRef(0);

  const installerTestValidation = useMemo(() => validateInstallerForTest(packageForm), [packageForm]);
  const installerTestRatio = installerTestProgress?.ratio ?? 0;
  const installerTestPercent = installerTestProgress?.percent ?? Math.round(installerTestRatio * 100);
  const installerTestLabel = installerTestProgress?.label ?? '';
  const installerTestPhase = installerTestProgress?.phase ?? 'idle';
  const installerTestTone =
    installerTestPhase === 'error'
      ? 'text-red-600 dark:text-red-400'
      : installerTestPhase === 'done'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-blue-600 dark:text-blue-400';

  const uninstallerTestValidation = useMemo(() => validateUninstallerForTest(packageForm), [packageForm]);
  const uninstallerTestPhase = uninstallerTestError
    ? 'error'
    : uninstallerTestRunning
      ? 'running'
      : uninstallerTestDone
        ? 'done'
        : 'idle';
  const uninstallerTestTone =
    uninstallerTestPhase === 'error'
      ? 'text-red-600 dark:text-red-400'
      : uninstallerTestPhase === 'done'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-blue-600 dark:text-blue-400';
  const uninstallerTestRatio = uninstallerTestPhase === 'done' ? 1 : uninstallerTestPhase === 'running' ? 0.4 : 0;
  const uninstallerTestPercent = Math.round(uninstallerTestRatio * 100);
  const uninstallerTestLabel =
    uninstallerTestPhase === 'running' ? '実行中…' : uninstallerTestPhase === 'done' ? '完了' : '';

  useEffect(() => {
    installerTestTokenRef.current += 1;
    uninstallerTestTokenRef.current += 1;
    setInstallerTestRunning(false);
    setInstallerTestProgress(null);
    setInstallerTestError('');
    setInstallerTestDetectedVersion('');
    setUninstallerTestRunning(false);
    setUninstallerTestError('');
    setUninstallerTestDone(false);
  }, [selectedPackageId]);

  const handleInstallerTest = useCallback(async () => {
    if (installerTestRunning) return;
    setInstallerTestError('');
    setInstallerTestDetectedVersion('');
    const validation = validateInstallerForTest(packageForm);
    if (validation) {
      return;
    }
    const testItem: InstallerTestItem = buildInstallerTestItem(packageForm);
    // token により「最後に開始したテスト」の結果だけを採用する。
    const token = installerTestTokenRef.current + 1;
    installerTestTokenRef.current = token;
    setInstallerTestRunning(true);
    setInstallerTestProgress({ ratio: 0, percent: 0, label: '準備中…', phase: 'init' });
    try {
      await runInstallerForItem(testItem, null, (progress: InstallerTestProgress) => {
        if (installerTestTokenRef.current !== token) return;
        setInstallerTestProgress(progress);
      });
      if (installerTestTokenRef.current !== token) return;
      try {
        const map = (await detectInstalledVersionsMap([testItem])) as Record<string, unknown>;
        if (installerTestTokenRef.current !== token) return;
        const detectedValue = map?.[testItem.id];
        const detected = typeof detectedValue === 'string' ? detectedValue : String(detectedValue || '');
        setInstallerTestDetectedVersion(detected);
      } catch {
        if (installerTestTokenRef.current !== token) return;
        setInstallerTestDetectedVersion('');
      }
    } catch (err) {
      if (installerTestTokenRef.current !== token) return;
      const detail = err instanceof Error ? err.message : String(err) || '原因不明のエラー';
      setInstallerTestError(`インストーラーテストに失敗しました。\n\n${detail}`);
    } finally {
      if (installerTestTokenRef.current === token) {
        setInstallerTestRunning(false);
      }
    }
  }, [installerTestRunning, packageForm]);

  const handleUninstallerTest = useCallback(async () => {
    if (uninstallerTestRunning) return;
    setUninstallerTestError('');
    setUninstallerTestDone(false);
    const validation = validateUninstallerForTest(packageForm);
    if (validation) {
      return;
    }
    const testItem: InstallerTestItem = buildInstallerTestItem(packageForm);
    // インストールテスト同様、競合する非同期結果を token で抑止する。
    const token = uninstallerTestTokenRef.current + 1;
    uninstallerTestTokenRef.current = token;
    setUninstallerTestRunning(true);
    try {
      await runUninstallerForItem(testItem, null);
      if (uninstallerTestTokenRef.current === token) {
        setUninstallerTestDone(true);
      }
    } catch (err) {
      if (uninstallerTestTokenRef.current !== token) return;
      const detail = err instanceof Error ? err.message : String(err) || '原因不明のエラー';
      setUninstallerTestError(`削除テストに失敗しました。\n\n${detail}`);
    } finally {
      if (uninstallerTestTokenRef.current === token) {
        setUninstallerTestRunning(false);
      }
    }
  }, [uninstallerTestRunning, packageForm]);

  return {
    installerTestRunning,
    installerTestValidation,
    installerTestRatio,
    installerTestPhase,
    installerTestTone,
    installerTestLabel,
    installerTestPercent,
    installerTestDetectedVersion,
    installerTestError,
    uninstallerTestRunning,
    uninstallerTestValidation,
    uninstallerTestRatio,
    uninstallerTestPhase,
    uninstallerTestTone,
    uninstallerTestLabel,
    uninstallerTestPercent,
    uninstallerTestError,
    handleInstallerTest,
    handleUninstallerTest,
  };
}
