/**
 * インストール／削除テストの進行状態を管理する hook
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectInstalledVersionsMap, runInstallerForItem, runUninstallerForItem } from '../../../../utils/index.js';
import { buildInstallerTestItem, validateInstallerForTest, validateUninstallerForTest } from '../../model/form';
import type { RegisterPackageForm } from '../../model/types';
import type { InstallerTestItem, InstallerTestProgress, RegisterTestOperation } from '../types';

interface UseRegisterTestStateArgs {
  packageForm: RegisterPackageForm;
  selectedPackageId: string;
  flushDraftBeforeTest?: () => void;
  onTestPassed?: (kind: 'installer' | 'uninstaller') => void;
}

type RegisterTestOperationPayload = Omit<RegisterTestOperation, 'key'>;

const OPERATION_KINDS: RegisterTestOperation['kind'][] = [
  'download',
  'extract',
  'extract_sfx',
  'copy',
  'delete',
  'run',
  'error',
];
const OPERATION_STATUSES: RegisterTestOperation['status'][] = ['done', 'skip', 'error'];

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text ? text : undefined;
}

function normalizeOperationKind(value: unknown): RegisterTestOperation['kind'] {
  return OPERATION_KINDS.includes(value as RegisterTestOperation['kind'])
    ? (value as RegisterTestOperation['kind'])
    : 'error';
}

function normalizeOperationStatus(
  value: unknown,
  kind: RegisterTestOperation['kind'],
): RegisterTestOperation['status'] {
  if (OPERATION_STATUSES.includes(value as RegisterTestOperation['status'])) {
    return value as RegisterTestOperation['status'];
  }
  return kind === 'error' ? 'error' : 'done';
}

function normalizeOperation(
  value: Partial<RegisterTestOperationPayload> | null | undefined,
): RegisterTestOperationPayload {
  const kind = normalizeOperationKind(value?.kind);
  return {
    kind,
    status: normalizeOperationStatus(value?.status, kind),
    summary: typeof value?.summary === 'string' ? value.summary : '',
    detail: typeof value?.detail === 'string' ? value.detail : '',
    fromPath: toOptionalText(value?.fromPath),
    toPath: toOptionalText(value?.toPath),
    targetPath: toOptionalText(value?.targetPath),
  };
}

export default function useRegisterTestState({
  packageForm,
  selectedPackageId,
  flushDraftBeforeTest,
  onTestPassed,
}: UseRegisterTestStateArgs) {
  const [installerTestRunning, setInstallerTestRunning] = useState(false);
  const [installerTestProgress, setInstallerTestProgress] = useState<InstallerTestProgress | null>(null);
  const [installerTestError, setInstallerTestError] = useState('');
  const [installerTestDetectedVersion, setInstallerTestDetectedVersion] = useState('');
  const [installerTestOperations, setInstallerTestOperations] = useState<RegisterTestOperation[]>([]);
  const [uninstallerTestRunning, setUninstallerTestRunning] = useState(false);
  const [uninstallerTestError, setUninstallerTestError] = useState('');
  const [uninstallerTestDone, setUninstallerTestDone] = useState(false);
  const [uninstallerTestOperations, setUninstallerTestOperations] = useState<RegisterTestOperation[]>([]);
  const installerTestTokenRef = useRef(0);
  const uninstallerTestTokenRef = useRef(0);
  const installerTestBusyRef = useRef(false);
  const uninstallerTestBusyRef = useRef(false);
  const installerOperationSeqRef = useRef(0);
  const uninstallerOperationSeqRef = useRef(0);

  const pushInstallerOperation = useCallback((operation: Partial<RegisterTestOperationPayload> | null | undefined) => {
    const normalized = normalizeOperation(operation);
    setInstallerTestOperations((prev) => [
      ...prev,
      {
        ...normalized,
        key: `installer-${installerOperationSeqRef.current++}`,
      },
    ]);
  }, []);

  const pushUninstallerOperation = useCallback(
    (operation: Partial<RegisterTestOperationPayload> | null | undefined) => {
      const normalized = normalizeOperation(operation);
      setUninstallerTestOperations((prev) => [
        ...prev,
        {
          ...normalized,
          key: `uninstall-${uninstallerOperationSeqRef.current++}`,
        },
      ]);
    },
    [],
  );

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
    installerTestBusyRef.current = false;
    uninstallerTestBusyRef.current = false;
    installerOperationSeqRef.current = 0;
    uninstallerOperationSeqRef.current = 0;
    setInstallerTestRunning(false);
    setInstallerTestProgress(null);
    setInstallerTestError('');
    setInstallerTestDetectedVersion('');
    setInstallerTestOperations([]);
    setUninstallerTestRunning(false);
    setUninstallerTestError('');
    setUninstallerTestDone(false);
    setUninstallerTestOperations([]);
  }, [selectedPackageId]);

  const handleInstallerTest = useCallback(async () => {
    if (installerTestRunning || installerTestBusyRef.current) return;
    setInstallerTestError('');
    setInstallerTestDetectedVersion('');
    installerOperationSeqRef.current = 0;
    setInstallerTestOperations([]);
    if (installerTestValidation) {
      return;
    }
    flushDraftBeforeTest?.();
    const testItem: InstallerTestItem = buildInstallerTestItem(packageForm);
    // token により「最後に開始したテスト」の結果だけを採用する。
    const token = installerTestTokenRef.current + 1;
    installerTestTokenRef.current = token;
    installerTestBusyRef.current = true;
    setInstallerTestRunning(true);
    setInstallerTestProgress({ ratio: 0, percent: 0, label: '準備中…', phase: 'init' });
    try {
      await runInstallerForItem(
        testItem,
        null,
        (progress: InstallerTestProgress) => {
          if (installerTestTokenRef.current !== token) return;
          setInstallerTestProgress(progress);
        },
        (operation: Partial<RegisterTestOperationPayload> | null | undefined) => {
          if (installerTestTokenRef.current !== token) return;
          pushInstallerOperation(operation);
        },
      );
      if (installerTestTokenRef.current !== token) return;
      let detected = '';
      try {
        const map = (await detectInstalledVersionsMap([testItem])) as Record<string, unknown>;
        if (installerTestTokenRef.current !== token) return;
        const detectedValue = map?.[testItem.id];
        detected = typeof detectedValue === 'string' ? detectedValue : String(detectedValue || '');
      } catch {
        if (installerTestTokenRef.current !== token) return;
        detected = '';
      }
      if (installerTestTokenRef.current !== token) return;
      setInstallerTestDetectedVersion(detected);
      const normalizedDetected = detected.trim();
      if (!normalizedDetected || normalizedDetected === '???') {
        throw new Error('検出バージョンが未検出または ??? のため、完了として扱えません。');
      }
      if (installerTestTokenRef.current === token) {
        onTestPassed?.('installer');
      }
    } catch (err) {
      if (installerTestTokenRef.current !== token) return;
      const detail = err instanceof Error ? err.message : String(err) || '原因不明のエラー';
      setInstallerTestError(`インストーラーテストに失敗しました。\n\n${detail}`);
      setInstallerTestProgress((prev) => ({
        ratio: prev?.ratio ?? 1,
        percent: prev?.percent ?? 100,
        label: 'エラー',
        phase: 'error',
      }));
    } finally {
      if (installerTestTokenRef.current === token) {
        setInstallerTestRunning(false);
        installerTestBusyRef.current = false;
      }
    }
  }, [
    flushDraftBeforeTest,
    installerTestRunning,
    installerTestValidation,
    onTestPassed,
    packageForm,
    pushInstallerOperation,
  ]);

  const handleUninstallerTest = useCallback(async () => {
    if (uninstallerTestRunning || uninstallerTestBusyRef.current) return;
    setUninstallerTestError('');
    setUninstallerTestDone(false);
    uninstallerOperationSeqRef.current = 0;
    setUninstallerTestOperations([]);
    if (uninstallerTestValidation) {
      return;
    }
    flushDraftBeforeTest?.();
    const testItem: InstallerTestItem = buildInstallerTestItem(packageForm);
    // インストールテスト同様、競合する非同期結果を token で抑止する。
    const token = uninstallerTestTokenRef.current + 1;
    uninstallerTestTokenRef.current = token;
    uninstallerTestBusyRef.current = true;
    setUninstallerTestRunning(true);
    try {
      await runUninstallerForItem(
        testItem,
        null,
        (operation: Partial<RegisterTestOperationPayload> | null | undefined) => {
          if (uninstallerTestTokenRef.current !== token) return;
          pushUninstallerOperation(operation);
        },
      );
      if (uninstallerTestTokenRef.current === token) {
        setUninstallerTestDone(true);
        onTestPassed?.('uninstaller');
      }
    } catch (err) {
      if (uninstallerTestTokenRef.current !== token) return;
      const detail = err instanceof Error ? err.message : String(err) || '原因不明のエラー';
      setUninstallerTestError(`削除テストに失敗しました。\n\n${detail}`);
    } finally {
      if (uninstallerTestTokenRef.current === token) {
        setUninstallerTestRunning(false);
        uninstallerTestBusyRef.current = false;
      }
    }
  }, [
    flushDraftBeforeTest,
    onTestPassed,
    packageForm,
    pushUninstallerOperation,
    uninstallerTestRunning,
    uninstallerTestValidation,
  ]);

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
    installerTestOperations,
    uninstallerTestRunning,
    uninstallerTestValidation,
    uninstallerTestRatio,
    uninstallerTestPhase,
    uninstallerTestTone,
    uninstallerTestLabel,
    uninstallerTestPercent,
    uninstallerTestError,
    uninstallerTestOperations,
    handleInstallerTest,
    handleUninstallerTest,
  };
}
