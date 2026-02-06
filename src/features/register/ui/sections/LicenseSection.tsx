/**
 * ライセンス情報入力コンポーネント
 */
import React, { memo, useEffect, useState } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { LICENSE_TYPE_OPTIONS, buildLicenseBody } from '../../../../utils/licenseTemplates.js';
import { createEmptyLicense } from '../../model/form';
import type { PackageLicenseSectionProps } from '../types';
import ActionDropdown from '../components/ActionDropdown';

const LICENSE_TYPE_SELECT_OPTIONS = [{ value: '', label: '選択してください' }, ...LICENSE_TYPE_OPTIONS];

const PackageLicenseSection = memo(
  function PackageLicenseSection({
    license,
    onUpdateLicenseField,
    onToggleTemplate,
    onUpdateCopyright,
  }: PackageLicenseSectionProps) {
    const activeLicense = license || createEmptyLicense();
    const type = activeLicense.type;
    const isOtherType = type === 'その他';
    const isUnknown = type === '不明';
    const forceBodyInput = isOtherType;
    const useTemplate = !forceBodyInput && !isUnknown && !activeLicense.isCustom;
    const needsCopyrightInput = useTemplate && type !== 'CC0-1.0';
    const showBodyInput = forceBodyInput || (!isUnknown && !useTemplate);
    const templatePreview = useTemplate ? buildLicenseBody(activeLicense) : '';
    const [copied, setCopied] = useState(false);

    useEffect(() => {
      setCopied(false);
    }, [templatePreview, activeLicense.key]);

    async function handleCopyPreview(e: React.MouseEvent<HTMLButtonElement>) {
      e.preventDefault();
      e.stopPropagation();
      if (!templatePreview) return;
      try {
        await navigator.clipboard.writeText(templatePreview);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">ライセンス</h2>
        </div>
        <div className="space-y-4">
          <div
            key={activeLicense.key}
            className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  htmlFor={`license-type-${activeLicense.key}`}
                >
                  種類<span className="text-red-500">*</span>
                </label>
                <ActionDropdown
                  value={activeLicense.type}
                  onChange={(val) => onUpdateLicenseField(activeLicense.key, 'type', val)}
                  options={LICENSE_TYPE_SELECT_OPTIONS}
                  ariaLabel="ライセンスの種類を選択"
                  buttonId={`license-type-${activeLicense.key}`}
                />
              </div>
              {isOtherType && (
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    htmlFor={`license-name-${activeLicense.key}`}
                  >
                    ライセンス名<span className="text-red-500">*</span>
                  </label>
                  <input
                    id={`license-name-${activeLicense.key}`}
                    value={activeLicense.licenseName}
                    onChange={(e) => onUpdateLicenseField(activeLicense.key, 'licenseName', e.target.value)}
                    placeholder="ライセンス名を入力してください"
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    カスタムライセンスの場合は「カスタムライセンス」と入力してください。
                  </p>
                </div>
              )}
              {!isUnknown && !isOtherType && (
                <div className="relative flex items-end pb-1">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={useTemplate}
                      onChange={(e) => onToggleTemplate(activeLicense.key, e.target.checked)}
                      disabled={forceBodyInput}
                    />
                    <div className="relative inline-flex h-6 w-11 flex-none items-center rounded-full bg-slate-200 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-checked:bg-blue-600 dark:bg-slate-700">
                      <span
                        className={`absolute left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${useTemplate ? 'translate-x-5' : ''}`}
                      />
                    </div>
                    <span>テンプレートを使用する</span>
                  </label>
                </div>
              )}
            </div>
            {showBodyInput ? (
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  htmlFor={`license-body-${activeLicense.key}`}
                >
                  ライセンス本文{forceBodyInput ? <span className="text-red-500">*</span> : ''}
                </label>
                <textarea
                  id={`license-body-${activeLicense.key}`}
                  className="min-h-[160px] font-mono text-xs leading-relaxed"
                  value={activeLicense.licenseBody}
                  onChange={(e) => onUpdateLicenseField(activeLicense.key, 'licenseBody', e.target.value)}
                  placeholder="ライセンス本文を入力してください"
                  required={forceBodyInput}
                />
              </div>
            ) : isUnknown ? null : needsCopyrightInput ? (
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                テンプレートを使用します。著作権年と著作権者を入力してください。
              </div>
            ) : null}
            {useTemplate && (
              <div className="space-y-4">
                {needsCopyrightInput &&
                  activeLicense.copyrights.map((copyright) => (
                    <div key={copyright.key} className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          htmlFor={`license-${activeLicense.key}-copyright-years-${copyright.key}`}
                        >
                          著作権年
                        </label>
                        <input
                          id={`license-${activeLicense.key}-copyright-years-${copyright.key}`}
                          value={copyright.years}
                          onChange={(e) => onUpdateCopyright(activeLicense.key, copyright.key, 'years', e.target.value)}
                          placeholder="(例: 2025)"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          className="text-sm font-medium text-slate-700 dark:text-slate-300"
                          htmlFor={`license-${activeLicense.key}-copyright-holder-${copyright.key}`}
                        >
                          著作権者
                        </label>
                        <input
                          id={`license-${activeLicense.key}-copyright-holder-${copyright.key}`}
                          value={copyright.holder}
                          onChange={(e) =>
                            onUpdateCopyright(activeLicense.key, copyright.key, 'holder', e.target.value)
                          }
                          placeholder="(例: KENくん)"
                        />
                      </div>
                    </div>
                  ))}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <details className="group">
                    <summary className="flex cursor-pointer items-center justify-between bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      <span>プレビュー</span>
                      <div className="flex items-center gap-2">
                        {copied && (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-right-1">
                            コピーしました
                          </span>
                        )}
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCopyPreview(e);
                          }}
                          disabled={!templatePreview}
                          aria-label="ライセンス本文をコピー"
                          title="クリップボードにコピー"
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <span className="text-slate-400 transition-transform group-open:rotate-180">
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </summary>
                    <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                      {templatePreview ? (
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                          {templatePreview}
                        </pre>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          プレビューは種類と著作権者を入力すると表示されます。
                        </p>
                      )}
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  },
  (prev: Readonly<PackageLicenseSectionProps>, next: Readonly<PackageLicenseSectionProps>) =>
    prev.license === next.license &&
    prev.onUpdateLicenseField === next.onUpdateLicenseField &&
    prev.onToggleTemplate === next.onToggleTemplate &&
    prev.onUpdateCopyright === next.onUpdateCopyright,
);

export default PackageLicenseSection;
