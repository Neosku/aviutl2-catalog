import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Bug,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Smartphone,
  FileText,
  Trash2,
} from 'lucide-react';
import { collectDeviceInfo, readAppLog, loadInstalledMap } from '../utils/index.js';

const SUBMIT_ACTIONS = {
  bug: 'issues',
  inquiry: 'feedback',
};

const DeleteButton = memo(function DeleteButton({ onClick, ariaLabel = '削除', title }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
      aria-label={ariaLabel}
      title={title || ariaLabel}
      onClick={onClick}
    >
      <Trash2 size={16} />
    </button>
  );
});

function VisibilityBadge({ type = 'public', label }) {
  const text = label || (type === 'public' ? '公開' : '非公開');
  const tone =
    type === 'public'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
      : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}
    >
      {text}
    </span>
  );
}

export default function Feedback() {
  const submitEndpoint = (import.meta.env.VITE_SUBMIT_ENDPOINT || '').trim();
  const allowedModesNormalized = useMemo(() => ['bug', 'inquiry'], []);
  const initialMode = 'bug';
  const [mode, setMode] = useState(() => {
    if (allowedModesNormalized.includes(initialMode)) return initialMode;
    return allowedModesNormalized[0] || 'bug';
  });

  useEffect(() => {
    if (!allowedModesNormalized.includes(mode)) {
      setMode(allowedModesNormalized[0] || 'bug');
    }
  }, [allowedModesNormalized, mode]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bug, setBug] = useState({
    title: '',
    detail: '',
    contact: '',
    includeApp: true,
    includeDevice: true,
    includeLog: true,
  });
  const [device, setDevice] = useState(null);
  const [pluginsPreview, setPluginsPreview] = useState('');
  const [pluginsCount, setPluginsCount] = useState(0);
  const [appLog, setAppLog] = useState('');
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [appVersion, setAppVersion] = useState('');
  const [inq, setInq] = useState({ title: '', detail: '', contact: '' });
  const [successDialog, setSuccessDialog] = useState({ open: false, message: '', url: '' });

  useEffect(() => {
    document.body.classList.add('route-submit');
    return () => {
      document.body.classList.remove('route-submit');
    };
  }, []);

  // バグ報告モードのときだけ、端末情報やログを読み込む
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingDiag(true);
      try {
        const info = await collectDeviceInfo();
        if (!cancelled) setDevice(info);
      } catch {
        if (!cancelled) setDevice(null);
      }
      try {
        const app = await import('@tauri-apps/api/app');
        const v = app?.getVersion ? await app.getVersion() : '';
        if (!cancelled) setAppVersion(String(v || ''));
      } catch {
        if (!cancelled) setAppVersion('');
      }
      try {
        const map = await loadInstalledMap();
        if (!cancelled) {
          const entries = Object.entries(map || {});
          setPluginsCount(entries.length);
          const lines = entries
            .map(([id, ver]) => (ver ? `${id} ${ver}` : id))
            .slice(0, 300)
            .join('\n');
          setPluginsPreview(lines);
        }
      } catch {
        if (!cancelled) {
          setPluginsPreview('');
          setPluginsCount(0);
        }
      }
      try {
        const text = await readAppLog();
        if (!cancelled) setAppLog(text || '');
      } catch {
        if (!cancelled) setAppLog('');
      }
      if (!cancelled) setLoadingDiag(false);
    }
    if (mode === 'bug') load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const handleBugChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setBug((prev) => ({ ...prev, [name]: type === 'checkbox' ? !!checked : value }));
  }, []);

  const handleInqChange = useCallback((e) => {
    const { name, value } = e.target;
    setInq((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onFilesChange = useCallback((e) => {
    const files = Array.from(e.target?.files || []);
    setAttachments((prev) => {
      const list = Array.from(prev || []);
      const existing = new Set(list.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
      for (const f of files) {
        const key = `${f.name}:${f.size}:${f.lastModified}`;
        if (!existing.has(key)) {
          list.push(f);
          existing.add(key);
        }
      }
      return list;
    });
    try {
      if (e.target) e.target.value = '';
    } catch {
      /* ignore */
    }
  }, []);

  const removeAttachment = useCallback((index) => {
    setAttachments((prev) => (prev || []).filter((_, i) => i !== index));
  }, []);

  const closeSuccessDialog = useCallback(() => {
    setSuccessDialog({ open: false, message: '', url: '' });
  }, []);

  // モード別に payload を組み立て、フォームデータと添付を送信
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      if (!submitEndpoint) {
        setError('VITE_SUBMIT_ENDPOINT が設定されていません。');
        return;
      }
      if (!/^https:\/\//i.test(submitEndpoint)) {
        setError('VITE_SUBMIT_ENDPOINT には https:// で始まるURLを設定してください。');
        return;
      }
      try {
        let payload = {};
        const formData = new FormData();
        if (mode === 'bug') {
          if (!bug.title.trim() || !bug.detail.trim()) {
            setError('タイトルと詳細は必須です');
            return;
          }
          const lines = [];
          lines.push(bug.detail.trim());
          let osStr = '';
          let cpuStr = '';
          let gpuStr = '';
          let installedStr = '';
          if (bug.includeDevice) {
            osStr = `${device?.os?.name || ''} ${device?.os?.version || ''} (${device?.os?.arch || ''})`.trim();
            cpuStr =
              `${device?.cpu?.model || ''}${device?.cpu?.cores ? ` / Cores: ${device.cpu.cores}` : ''}${device?.cpu?.logicalProcessors ? ` / Logical: ${device.cpu.logicalProcessors}` : ''}${device?.cpu?.maxClockMHz ? ` / Max Clock: ${device.cpu.maxClockMHz} MHz` : ''}`.trim();
            gpuStr = `${device?.gpu?.name || device?.gpu?.vendor || ''} ${device?.gpu?.driver || ''}`.trim();
          }
          if (bug.includeApp && pluginsPreview) {
            installedStr = pluginsPreview;
          }
          payload = {
            action: SUBMIT_ACTIONS.bug,
            title: `不具合報告: ${bug.title.trim()}`,
            body: lines.join('\n'),
            labels: ['bug', 'from-client'],
            contact: bug.contact.trim() || undefined,
            appVersion: bug.includeApp ? appVersion || undefined : undefined,
            os: osStr || undefined,
            cpu: cpuStr || undefined,
            gpu: gpuStr || undefined,
            installed: installedStr
              ? installedStr
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : undefined,
          };
          attachments.forEach((f) => {
            formData.append('files[]', f, f.name || 'attachment');
          });
          if (bug.includeLog && appLog) {
            const blob = new Blob([appLog], { type: 'text/plain' });
            formData.append('files[]', blob, 'app.log');
          }
        } else {
          if (!inq.title.trim() || !inq.detail.trim()) {
            setError('タイトルと詳細は必須です');
            return;
          }
          payload = {
            action: SUBMIT_ACTIONS.inquiry,
            title: `問い合わせ: ${inq.title.trim()}`,
            body: inq.detail.trim(),
            labels: ['inquiry', 'from-client'],
            contact: inq.contact.trim() || undefined,
          };
          attachments.forEach((f) => {
            formData.append('files[]', f, f.name || 'attachment');
          });
        }

        formData.append('payload', JSON.stringify(payload));
        setSubmitting(true);
        const res = await fetch(submitEndpoint, { method: 'POST', body: formData });
        const contentType = res.headers.get('content-type') || '';
        let responseJson = null;
        let responseText = '';
        if (contentType.includes('application/json')) {
          responseJson = await res.json().catch(() => null);
        } else if (res.status !== 204) {
          responseText = await res.text().catch(() => '');
        }
        if (!res.ok) {
          const message =
            responseJson?.error ||
            responseJson?.message ||
            responseJson?.detail ||
            responseText ||
            `HTTP ${res.status}`;
          throw new Error(message);
        }
        const successUrl = responseJson?.pr_url || responseJson?.public_issue_url || responseJson?.url;
        const defaultMessage =
          mode === 'bug'
            ? '不具合報告を送信しました。ご協力ありがとうございます。'
            : '意見/問い合わせを送信しました。ありがとうございます。';
        const friendlyMessage = responseJson?.message || responseText || defaultMessage;
        setSuccessDialog({
          open: true,
          message: friendlyMessage,
          url: successUrl || '',
        });
      } catch (err) {
        console.error(err);
        setError(err?.message || '送信に失敗しました。ネットワークや設定をご確認ください。');
      } finally {
        setSubmitting(false);
      }
    },
    [mode, bug, appVersion, device, pluginsPreview, attachments, appLog, inq, submitEndpoint],
  );

  const successPrimaryText = successDialog.message || '送信が完了しました。';

  const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow select-text';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5';

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-300 select-none">
      {successDialog.open &&
        createPortal(
          <div
            className="fixed top-8 inset-x-0 bottom-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-success-title"
          >
            <button
              type="button"
              aria-label="閉じる"
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px] cursor-pointer"
              onClick={closeSuccessDialog}
            />
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
                <h3 id="submit-success-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  送信完了
                </h3>
              </div>
              <div className="px-6 py-8">
                <p className="font-medium text-slate-700 dark:text-slate-200 select-text">{successPrimaryText}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                {successDialog.url && (
                  <a
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    href={successDialog.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <ExternalLink size={16} />
                    公開ページを開く
                  </a>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-500 shadow-sm cursor-pointer"
                  onClick={closeSuccessDialog}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">フィードバック</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">不具合のご報告やご意見をお寄せください</p>
        </div>
        <a
          href="https://github.com/Neosku/aviutl2-catalog/issues"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ExternalLink size={16} />
          報告済みの不具合
        </a>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 flex items-start gap-2 select-text"
          role="alert"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {allowedModesNormalized.length > 1 && (
          <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1 flex gap-1 m-4 rounded-lg border border-slate-200/50 dark:border-slate-800/50 w-fit">
            <button
              type="button"
              onClick={() => setMode('bug')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                mode === 'bug'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Bug size={16} />
              不具合報告
            </button>
            <button
              type="button"
              onClick={() => setMode('inquiry')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                mode === 'inquiry'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare size={16} />
              意見・問い合わせ
            </button>
          </div>
        )}

        <div className="p-6 pt-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {mode === 'bug' && (
              <>
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200">
                  <div className="flex items-center gap-2 mb-1 font-semibold">
                    <VisibilityBadge type="public" />
                    <span>公開設定</span>
                  </div>
                  <div className="opacity-90 text-xs leading-relaxed">
                    <strong>タイトル</strong> と <strong>詳細</strong>{' '}
                    は公開されます。連絡先、添付ファイル、デバイス情報などのメタデータは公開されません
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass} htmlFor="bug-title">
                      タイトル <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="bug-title"
                      name="title"
                      value={bug.title}
                      onChange={handleBugChange}
                      required
                      placeholder="不具合の概要を入力してください"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="bug-detail">
                      詳細 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="bug-detail"
                      name="detail"
                      value={bug.detail}
                      onChange={handleBugChange}
                      required
                      placeholder="発生状況、再現手順、期待する動作などを詳しく入力してください"
                      className={`${inputClass} min-h-[160px] resize-y`}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="bug-contact">
                      連絡先 <span className="text-slate-400 font-normal text-xs ml-1">(任意)</span>
                    </label>
                    <input
                      id="bug-contact"
                      name="contact"
                      value={bug.contact}
                      onChange={handleBugChange}
                      placeholder="メールアドレスやXアカウント（開発者から連絡する場合があります）"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-6">
                  {/* Attachments */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <Paperclip size={16} className="text-slate-500" />
                      添付ファイル
                    </div>
                    <div className="space-y-3">
                      <input
                        type="file"
                        multiple
                        onChange={onFilesChange}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700 transition-colors cursor-pointer file:cursor-pointer"
                      />
                      {attachments?.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {attachments.map((f, i) => (
                            <div
                              key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
                              className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                            >
                              <div className="flex-1 min-w-0">
                                <div
                                  className="truncate text-xs font-medium text-slate-700 dark:text-slate-300"
                                  title={f.name}
                                >
                                  {f.name}
                                </div>
                                <div className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</div>
                              </div>
                              <DeleteButton onClick={() => removeAttachment(i)} ariaLabel="添付ファイルを削除" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Environment Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <Smartphone size={16} className="text-slate-500" />
                      環境情報
                    </div>

                    {loadingDiag ? (
                      <div className="text-xs text-slate-500 animate-pulse">情報を収集中...</div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* App Info Toggle */}
                        <label className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer block">
                          <div className="flex items-center gap-3">
                            <div className="relative inline-flex items-center">
                              <input
                                type="checkbox"
                                name="includeApp"
                                checked={bug.includeApp}
                                onChange={handleBugChange}
                                className="peer sr-only"
                              />
                              <div className="h-5 w-9 rounded-full bg-slate-300 dark:bg-slate-600 peer-checked:bg-blue-600 transition-colors"></div>
                              <div
                                className={`absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${bug.includeApp ? 'translate-x-4' : ''}`}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              アプリ情報を添付
                            </span>
                          </div>
                          {bug.includeApp && (
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1 pl-1 border-l-2 border-slate-200 dark:border-slate-700 ml-1">
                              <div>Version: {appVersion || 'Unknown'}</div>
                              <div>パッケージ一覧: {pluginsCount}個</div>
                            </div>
                          )}
                        </label>

                        {/* Device Info Toggle */}
                        <label className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer block">
                          <div className="flex items-center gap-3">
                            <div className="relative inline-flex items-center">
                              <input
                                type="checkbox"
                                name="includeDevice"
                                checked={bug.includeDevice}
                                onChange={handleBugChange}
                                className="peer sr-only"
                              />
                              <div className="h-5 w-9 rounded-full bg-slate-300 dark:bg-slate-600 peer-checked:bg-blue-600 transition-colors"></div>
                              <div
                                className={`absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${bug.includeDevice ? 'translate-x-4' : ''}`}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              デバイス情報を添付
                            </span>
                          </div>
                          {bug.includeDevice && (
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1 pl-1 border-l-2 border-slate-200 dark:border-slate-700 ml-1 overflow-x-auto">
                              {device?.os && (
                                <div className="mb-1">
                                  <div className="font-semibold text-slate-600 dark:text-slate-300">[OS]</div>
                                  <div>
                                    {device.os.name} {device.os.version} ({device.os.arch})
                                  </div>
                                </div>
                              )}
                              {device?.cpu && (
                                <div className="mb-1">
                                  <div className="font-semibold text-slate-600 dark:text-slate-300">[CPU]</div>
                                  <div className="truncate" title={device.cpu.model}>
                                    {device.cpu.model}
                                  </div>
                                  <div>
                                    Cores: {device.cpu.cores} / Logical: {device.cpu.logicalProcessors}
                                  </div>
                                  {device.cpu.maxClockMHz && <div>Max Clock: {device.cpu.maxClockMHz} MHz</div>}
                                </div>
                              )}
                              {device?.gpu && (
                                <div>
                                  <div className="font-semibold text-slate-600 dark:text-slate-300">[GPU]</div>
                                  <div className="truncate" title={device.gpu.name}>
                                    {device.gpu.name || device.gpu.vendor}
                                  </div>
                                  <div className="truncate" title={device.gpu.driver}>
                                    Driver: {device.gpu.driver}
                                  </div>
                                </div>
                              )}
                              {!device && <div>デバイス情報を取得できませんでした</div>}
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Log Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <FileText size={16} className="text-slate-500" />
                      ログファイル
                    </div>
                    {loadingDiag ? (
                      <div className="text-xs text-slate-500 animate-pulse">情報を収集中...</div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="relative inline-flex items-center">
                            <input
                              type="checkbox"
                              name="includeLog"
                              checked={bug.includeLog}
                              onChange={handleBugChange}
                              className="peer sr-only"
                            />
                            <div className="h-5 w-9 rounded-full bg-slate-300 dark:bg-slate-600 peer-checked:bg-blue-600 transition-colors"></div>
                            <div
                              className={`absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${bug.includeLog ? 'translate-x-4' : ''}`}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">app.log を添付</span>
                        </label>
                        {bug.includeLog && (
                          <div className="mt-3">
                            {appLog ? (
                              <pre className="max-h-55 overflow-auto rounded-md bg-slate-100 p-2 text-[10px] text-slate-600 dark:bg-slate-900 dark:text-slate-400 font-mono scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 select-text">
                                {appLog}
                              </pre>
                            ) : (
                              <div className="text-xs text-slate-400 italic mt-1">ログを取得できませんでした。</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {mode === 'inquiry' && (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  <div className="flex items-center gap-2 mb-1 font-semibold">
                    <VisibilityBadge type="private" />
                    <span>非公開設定</span>
                  </div>
                  <div className="opacity-90 text-xs leading-relaxed">
                    ご意見・お問い合わせの内容は公開されません。開発者のみが確認します
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass} htmlFor="inq-title">
                      タイトル <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="inq-title"
                      name="title"
                      value={inq.title}
                      onChange={handleInqChange}
                      required
                      placeholder="件名を入力してください"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="inq-detail">
                      詳細 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="inq-detail"
                      name="detail"
                      value={inq.detail}
                      onChange={handleInqChange}
                      required
                      placeholder="ご意見やお問い合わせ内容を詳しく入力してください"
                      className={`${inputClass} min-h-[160px] resize-y`}
                    />
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="inq-contact">
                      連絡先 <span className="text-slate-400 font-normal text-xs ml-1">(任意)</span>
                    </label>
                    <input
                      id="inq-contact"
                      name="contact"
                      value={inq.contact}
                      onChange={handleInqChange}
                      placeholder="メールアドレスやXアカウント（必要に応じて開発者から連絡します）"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <Paperclip size={16} className="text-slate-500" />
                      添付ファイル <span className="text-slate-400 font-normal text-xs">(任意)</span>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="file"
                        multiple
                        onChange={onFilesChange}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700 transition-colors cursor-pointer file:cursor-pointer"
                      />
                      {attachments?.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {attachments.map((f, i) => (
                            <div
                              key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
                              className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                            >
                              <div className="flex-1 min-w-0">
                                <div
                                  className="truncate text-xs font-medium text-slate-700 dark:text-slate-300 select-text"
                                  title={f.name}
                                >
                                  {f.name}
                                </div>
                                <div className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</div>
                              </div>
                              <DeleteButton onClick={() => removeAttachment(i)} ariaLabel="添付ファイルを削除" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:hover:shadow-md disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                    送信中...
                  </>
                ) : (
                  <>送信する</>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
