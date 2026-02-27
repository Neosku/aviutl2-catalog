import React from 'react';
import { Smartphone } from 'lucide-react';
import { BUG_FIELDS } from '../../model/fieldNames';
import FeedbackToggleSwitch from '../components/FeedbackToggleSwitch';
import type { FeedbackEnvironmentSectionProps } from '../types';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';

const envMetaBaseClass = 'mt-2 ml-1 space-y-1 border-l-2 border-slate-200 pl-1';
const envMetaTextClass = 'text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400';

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
      <div className={text.inlineHeadingSm}>
        <Smartphone size={16} className="text-slate-500" />
        環境情報
      </div>
      {loading ? (
        <div className={layout.pulseXs}>情報を収集中...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={surface.softSelectable}>
            <div className={layout.inlineGap3}>
              <FeedbackToggleSwitch name={BUG_FIELDS.includeApp} checked={bug.includeApp} onChange={onBugChange} />
              <span className={text.labelSm}>アプリ情報を添付</span>
            </div>
            {bug.includeApp ? (
              <div className={cn(envMetaBaseClass, envMetaTextClass)}>
                <div>Version: {appVersion || 'Unknown'}</div>
                <div>パッケージ一覧: {pluginsCount}個</div>
              </div>
            ) : null}
          </label>

          <label className={surface.softSelectable}>
            <div className={layout.inlineGap3}>
              <FeedbackToggleSwitch
                name={BUG_FIELDS.includeDevice}
                checked={bug.includeDevice}
                onChange={onBugChange}
              />
              <span className={text.labelSm}>デバイス情報を添付</span>
            </div>
            {bug.includeDevice ? (
              <div className={cn(envMetaBaseClass, envMetaTextClass, 'overflow-x-auto')}>
                {device?.os ? (
                  <div className="mb-1">
                    <div className={text.semiboldMuted}>[OS]</div>
                    <div>
                      {device.os.name} {device.os.version} ({device.os.arch})
                    </div>
                  </div>
                ) : null}
                {device?.cpu ? (
                  <div className="mb-1">
                    <div className={text.semiboldMuted}>[CPU]</div>
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
                    <div className={text.semiboldMuted}>[GPU]</div>
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
