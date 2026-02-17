import React from 'react';
import { Smartphone } from 'lucide-react';
import { BUG_FIELDS } from '../../model/fieldNames';
import FeedbackToggleSwitch from '../components/FeedbackToggleSwitch';
import type { FeedbackEnvironmentSectionProps } from '../types';

export default function FeedbackEnvironmentSection({
  bug,
  loading,
  appVersion,
  pluginsCount,
  device,
  onBugChange,
}: FeedbackEnvironmentSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
        <Smartphone size={16} className="text-slate-500" />
        環境情報
      </div>
      {loading ? (
        <div className="animate-pulse text-xs text-slate-500">情報を収集中...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block cursor-pointer rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
              <FeedbackToggleSwitch name={BUG_FIELDS.includeApp} checked={bug.includeApp} onChange={onBugChange} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">アプリ情報を添付</span>
            </div>
            {bug.includeApp ? (
              <div className="mt-2 ml-1 space-y-1 border-l-2 border-slate-200 pl-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <div>Version: {appVersion || 'Unknown'}</div>
                <div>パッケージ一覧: {pluginsCount}個</div>
              </div>
            ) : null}
          </label>

          <label className="block cursor-pointer rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
              <FeedbackToggleSwitch
                name={BUG_FIELDS.includeDevice}
                checked={bug.includeDevice}
                onChange={onBugChange}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">デバイス情報を添付</span>
            </div>
            {bug.includeDevice ? (
              <div className="mt-2 ml-1 space-y-1 overflow-x-auto border-l-2 border-slate-200 pl-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {device?.os ? (
                  <div className="mb-1">
                    <div className="font-semibold text-slate-600 dark:text-slate-300">[OS]</div>
                    <div>
                      {device.os.name} {device.os.version} ({device.os.arch})
                    </div>
                  </div>
                ) : null}
                {device?.cpu ? (
                  <div className="mb-1">
                    <div className="font-semibold text-slate-600 dark:text-slate-300">[CPU]</div>
                    <div className="truncate" title={device.cpu.model}>
                      {device.cpu.model}
                    </div>
                    <div>
                      Cores: {device.cpu.cores} / Logical: {device.cpu.logicalProcessors}
                    </div>
                    {device.cpu.maxClockMHz ? <div>Max Clock: {device.cpu.maxClockMHz} MHz</div> : null}
                  </div>
                ) : null}
                {device?.gpu ? (
                  <div>
                    <div className="font-semibold text-slate-600 dark:text-slate-300">[GPU]</div>
                    <div className="truncate" title={device.gpu.name}>
                      {device.gpu.name || device.gpu.vendor}
                    </div>
                    <div className="truncate" title={device.gpu.driver}>
                      Driver: {device.gpu.driver}
                    </div>
                  </div>
                ) : null}
                {!device ? <div>デバイス情報を取得できませんでした</div> : null}
              </div>
            ) : null}
          </label>
        </div>
      )}
    </div>
  );
}
