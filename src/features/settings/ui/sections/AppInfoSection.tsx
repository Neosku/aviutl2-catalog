import { Info } from 'lucide-react';
import type { AppInfoSectionProps } from '../types';
import { surface, text } from '@/components/ui/_styles';

const infoRowClass = 'flex justify-between items-center text-sm';

export default function AppInfoSection({ appVersion }: AppInfoSectionProps) {
  return (
    <section className={surface.panelOverflow}>
      <div className={surface.sectionHeader}>
        <Info size={18} className="text-slate-500 dark:text-slate-400" />
        <h3 className={text.headingSmBold}>アプリ情報</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className={infoRowClass}>
          <span className="text-slate-500 dark:text-slate-400">バージョン</span>
          <span className="font-medium">{appVersion || '-'}</span>
        </div>
        <div className="space-y-2">
          <div className={infoRowClass}>
            <span className="text-slate-500 dark:text-slate-400">ライセンス</span>
            <span className="font-medium">MIT License</span>
          </div>
          <p className={text.mutedXsRelaxed}>
            本ソフトウェアは MIT License に基づき提供されます。ライセンス全文は LICENSE.txt をご参照ください。
          </p>
        </div>
      </div>
    </section>
  );
}
