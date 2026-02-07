import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, Search } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import { CatalogEntryState, useCatalog } from '../utils/catalogStore.jsx';
import { normalize } from '../utils/index.js';
import Checkbox from '../components/ui/Checkbox.js';
import z from 'zod';

type EligibleItem = CatalogEntryState & {
  niconiCommonsId: string;
};

export default function NiconiCommons() {
  const { items } = useCatalog();
  const deselectedIdsRef = useRef<string[]>([]);
  const skipPersistRef = useRef(true);
  const [query, setQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [copyState, setCopyState] = useState({ ok: false, message: '', count: 0 });

  // 対象となるアイテムを抽出
  const eligibleItems = useMemo((): EligibleItem[] => {
    return (items || [])
      .filter((item) => item && item.installed)
      .filter((item): item is EligibleItem => Boolean(item.niconiCommonsId));
  }, [items]);

  const sortedEligible = useMemo((): EligibleItem[] => {
    return eligibleItems.toSorted((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja'));
  }, [eligibleItems]);

  const queryKey = useMemo(() => normalize(query || ''), [query]);

  const filteredItems = useMemo(() => {
    if (!queryKey) return sortedEligible;
    return sortedEligible.filter((item) => {
      const nameKey = normalize(item.name || '');
      const idKey = normalize(item.id || '');
      const authorKey = normalize(item.author || '');
      const commonsKey = normalize(item.niconiCommonsId || '');
      return (
        nameKey.includes(queryKey) ||
        idKey.includes(queryKey) ||
        authorKey.includes(queryKey) ||
        commonsKey.includes(queryKey)
      );
    });
  }, [sortedEligible, queryKey]);

  // 保存済みの未選択IDを復元して初期選択に反映
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const schema = z.array(z.string());

    try {
      const raw = window.localStorage.getItem('niconiCommonsDeselectedIds');
      if (raw) {
        const parsed = JSON.parse(raw);
        const result = schema.safeParse(parsed);
        if (result.success) {
          deselectedIdsRef.current = parsed.map(String).filter(Boolean);
        }
      }
    } catch {}
    const deselectedSet = new Set(deselectedIdsRef.current);
    setSelectedMap(() => {
      const next: Record<string, true> = {};
      eligibleItems.forEach((item) => {
        if (!deselectedSet.has(item.id)) next[item.id] = true;
      });
      return next;
    });
  }, [eligibleItems]);

  // 選択変更があったら未選択IDを保存
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const deselected = eligibleItems.filter((item) => !selectedMap[item.id]).map((item) => item.id);
    deselectedIdsRef.current = deselected;
    try {
      window.localStorage.setItem('niconiCommonsDeselectedIds', JSON.stringify(deselected));
    } catch {}
  }, [eligibleItems, selectedMap]);

  const selectedItems = useMemo(() => {
    return eligibleItems.filter((item) => selectedMap[item.id]);
  }, [eligibleItems, selectedMap]);

  const selectedIds = useMemo(() => {
    return selectedItems.map((item) => item.niconiCommonsId).filter((item): item is string => Boolean(item));
  }, [selectedItems]);

  const selectedCount = selectedIds.length;
  const totalEligible = eligibleItems.length;
  const visibleCount = filteredItems.length;
  const allVisibleSelected = visibleCount > 0 && filteredItems.every((item) => selectedMap[item.id]);

  const toggleItem = useCallback(
    (id: string) => {
      setSelectedMap((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    },
    [setSelectedMap],
  );
  const toggleAllVisible = useCallback(() => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (allVisibleSelected) {
        filteredItems.forEach((item) => {
          next[item.id] = false;
        });
      } else {
        filteredItems.forEach((item) => {
          next[item.id] = true;
        });
      }
      return next;
    });
  }, [allVisibleSelected, filteredItems]);

  // IDをコピー
  const copyIds = useCallback(async (list: string[]) => {
    if (!list.length) return;
    try {
      await navigator.clipboard.writeText(list.join(' '));
      setCopyState({ ok: true, message: `${list.length}件をコピーしました`, count: list.length });
    } catch {
      setCopyState({ ok: false, message: 'コピーに失敗しました', count: 0 });
    }
  }, []);

  useEffect(() => {
    if (!copyState.message) return;
    const timer = setTimeout(() => setCopyState({ ok: false, message: '', count: 0 }), 2000);
    return () => clearTimeout(timer);
  }, [copyState.message]);

  return (
    <div className="max-w-4xl mx-auto select-none">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">ニコニ・コモンズID</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            インストール済みでニコニ・コモンズIDが登録されているパッケージの一覧を表示します
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn btn--primary cursor-pointer ${copyState.ok ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            onClick={() => copyIds(selectedIds)}
            disabled={selectedCount === 0}
            type="button"
          >
            {copyState.ok ? <Check size={16} /> : <Copy size={16} />}
            {copyState.ok ? `${copyState.count}件コピーしました` : 'ニコニ・コモンズIDをコピー'}
          </button>
        </div>
      </div>

      {/* 説明 */}
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
            onClick={async () => {
              try {
                await open('https://qa.nicovideo.jp/faq/show/863');
              } catch {}
            }}
            type="button"
          >
            <ExternalLink size={12} />
            親子登録の方法
          </button>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>表示 {visibleCount}件</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span>選択 {selectedCount}件</span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="search"
            placeholder="パッケージ名/ID/作者/コモンズID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {visibleCount === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            {totalEligible === 0 ? '対象となるパッケージがありません' : '該当なし'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide grid grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-2">
                <div className="flex items-center justify-center">
                  <Checkbox checked={allVisibleSelected} onChange={toggleAllVisible} ariaLabel="表示中をすべて選択" />
                </div>
                <span>パッケージ名</span>
                <span>作者名</span>
                <span>ニコニ・コモンズID</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 grid grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-2 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    tabIndex={0}
                    onClick={() => toggleItem(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleItem(item.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={!!selectedMap[item.id]}
                        onChange={() => toggleItem(item.id)}
                        ariaLabel={`${item.name || item.id} を選択`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {item.name || item.id}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.id}</div>
                    </div>
                    <div className="min-w-0 text-sm text-slate-600 dark:text-slate-300 truncate">{item.author}</div>
                    <div
                      className="text-sm font-mono text-slate-700 dark:text-slate-200 truncate"
                      title={item.niconiCommonsId}
                    >
                      {item.niconiCommonsId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
