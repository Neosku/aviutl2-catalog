import { ChevronDown, ExternalLink } from 'lucide-react';
import type { GuideSectionProps } from '../types';

export default function GuideSection({ onOpenGuide }: GuideSectionProps) {
  return (
    <details className="group mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-slate-700 dark:text-slate-200">
        <span>ニコニ・コモンズIDとは</span>
        <ChevronDown size={16} className="text-slate-400 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p className="leading-relaxed">
          <b>ニコニ・コモンズ</b>
          は、クリエイターの創作活動を支援し、安心して創作活動がおこなえるように、クリエイター同士の交流とコラボレーションや作品利用を促すサービスです。
          <br />
          ニコニコでは、制作に使ったツールや素材（例：AviUtl2本体、プラグイン、スクリプト、素材など）を<b>親作品</b>
          として登録し、作品同士のつながり（コンテンツツリー）を作れます。
          <br />
          ニコニコへの動画投稿時に親作品を登録すると、ツールや素材の製作者さんに応援の気持ちが届き、制作活動の励みになります。
          <br />
          さらにニコニコでは、「子ども手当」などの仕組みを通じて、製作者さんへの金銭的な還元にもつながります。
          <br />
          ぜひ親作品の登録をしてみてください。
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ※注意：親作品を登録しても、あなた自身の収益が減ることはありません。
        </p>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={onOpenGuide}
          type="button"
        >
          <ExternalLink size={12} />
          親子登録の方法
        </button>
      </div>
    </details>
  );
}
