// プラグイン一覧をアプリ全体で共有するためのストア
// React Context + useReducer で軽量に状態を管理します。
// - items: 画面に表示するパッケージ配列（正規化済みの派生フィールドを含む）
// - loading/error: ローディング・エラー状態
// - allTags/allTypes: UI のフィルター候補（全件から抽出）
// - installedMap/detectedMap: インストール情報（検出結果）
import { createContext, useReducer, useContext, useMemo } from 'react';
import { normalize, latestVersionOf } from './index.js';
import { CatalogEntry } from './catalogSchema.js';

type CatalogState = {
  items: CatalogEntryState[];
  loading: boolean;
  error: string | null;
  allTags: string[];
  allTypes: string[];
  installedIds: string[];
  installedMap: Record<string, string>; // id -> version
  detectedMap: Record<string, string>; // id -> version
};

export type CatalogEntryState = CatalogEntry & {
  updatedAt: number | null;
  nameKey: string;
  authorKey: string;
  summaryKey: string;
  installed: boolean;
  installedVersion?: string;
  isLatest?: boolean;
  catalogIndex: number;
};

// 読み取り用/更新用の Context を分離して、再レンダリングを最小化
const CatalogStateContext = createContext<CatalogState | null>(null);
const CatalogDispatchContext = createContext<React.Dispatch<CatalogAction> | null>(null);

// 更新日のタイムスタンプを算出
// 仕様: version[].release_date の最大値を updatedAt として使用
function toUpdatedAt(pkg: CatalogEntry) {
  if (!pkg.version.length) return null;
  let maxTs = 0;
  for (const ver of pkg.version) {
    const dt = new Date(ver.release_date);
    const ts = dt.getTime();
    if (Number.isFinite(ts) && ts > maxTs) {
      maxTs = ts;
    }
  }
  return maxTs || null;
}

// 検索・ソート用の派生フィールドを付与
// - updatedAt: 日付の数値化
// - nameKey/authorKey/summaryKey: 正規化キー（部分一致検索に利用）
function enrich(item: CatalogEntry) {
  return {
    ...item,
    updatedAt: toUpdatedAt(item),
    nameKey: normalize(item.name || ''),
    authorKey: normalize(item.author || ''),
    summaryKey: normalize(item.summary || ''),
  };
}

export function initCatalog(): CatalogState {
  // ストアの初期状態（アプリ起動直後）
  return {
    items: [],
    loading: true,
    error: null,
    allTags: [],
    allTypes: [],
    installedIds: [],
    installedMap: {},
    detectedMap: {},
  };
}

export type CatalogAction =
  | { type: 'SET_ITEMS'; payload: CatalogEntry[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_INSTALLED_IDS'; payload: string[] }
  | { type: 'SET_INSTALLED_MAP'; payload: Record<string, string> }
  | { type: 'SET_DETECTED_MAP'; payload: Record<string, string> }
  | { type: 'SET_DETECTED_ONE'; payload: { id: string; version: string } };

function catalogReducerInternal(state: CatalogState, action: CatalogAction): CatalogState {
  switch (action.type) {
    case 'SET_ITEMS': {
      // カタログ本体の差し替え
      // - installer があるものは downloadURL を installer:// に置き換え（UI でインストーラ起動）
      // - detectedMap（検出済みバージョン）から installed/isLatest を付加
      const items = (action.payload || [])
        .map((item, index) => ({ ...enrich({ ...item }), catalogIndex: index }))
        .map((it) => {
          const detectedVersion = state.detectedMap?.[it.id] || '';
          const latest = latestVersionOf(it) || '';
          const isLatest = !!detectedVersion && !!latest && detectedVersion === latest;
          return {
            ...it,
            installed: detectedVersion !== '',
            installedVersion: detectedVersion,
            isLatest,
          };
        });
      // タグ・種類の候補一覧を集計（重複排除）
      const tagSet = new Set(items.flatMap((item) => item.tags));
      const typeSet = new Set(items.map((item) => item.type));
      return { ...state, items, allTags: Array.from(tagSet), allTypes: Array.from(typeSet) };
    }
    case 'SET_LOADING':
      // ローディング状態の更新
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      // エラー文言の更新
      return { ...state, error: action.payload };
    case 'SET_INSTALLED_IDS': {
      // 手動管理の installedIds（将来拡張用の保持。現在の表示計算には未使用）
      const installedIds = Array.from(new Set(action.payload || []));
      const items = state.items.map((it) => it);
      return { ...state, installedIds, items };
    }
    case 'SET_INSTALLED_MAP': {
      const installedMap = action.payload || {};
      // 検出済み状態（detectedMap）には影響させず、記録目的で保持
      return { ...state, installedMap };
    }
    case 'SET_DETECTED_MAP': {
      // まとめて検出されたインストールバージョンを反映
      const detectedMap = action.payload || {};
      const items = state.items.map((it) => {
        const v = detectedMap[it.id] || '';
        const latest = latestVersionOf(it) || '';
        const isLatest = !!v && !!latest && v === latest;
        return { ...it, installed: v !== '', installedVersion: v, isLatest };
      });
      return { ...state, detectedMap, items };
    }
    case 'SET_DETECTED_ONE': {
      // 単一パッケージの検出結果を反映（インストール/アンインストール直後など）
      const { id, version } = action.payload || {};
      const detectedMap = { ...state.detectedMap };
      if (id) detectedMap[id] = version || '';
      const items = state.items.map((it) => {
        const v = it.id === id ? version || '' : state.detectedMap?.[it.id] || '';
        const latest = latestVersionOf(it) || '';
        const isLatest = !!v && !!latest && v === latest;
        return { ...it, installed: v !== '', installedVersion: v, isLatest };
      });
      return { ...state, detectedMap, items };
    }
    default:
      // 未知のアクションはそのまま返す
      return state;
  }
}

export function CatalogProvider({
  children,
  init,
}: {
  children: React.ReactNode;
  init: ReturnType<typeof initCatalog>;
}) {
  // Provider で reducer を構築。state は useMemo でメモ化し不要な再描画を抑制
  const [state, dispatch] = useReducer(catalogReducerInternal, init);
  const memoState = useMemo(() => state, [state]);
  return (
    <CatalogDispatchContext.Provider value={dispatch}>
      <CatalogStateContext.Provider value={memoState}>{children}</CatalogStateContext.Provider>
    </CatalogDispatchContext.Provider>
  );
}

export function useCatalog(): CatalogState {
  // 読み取り用フック。Provider 外での使用を防止
  const ctx = useContext(CatalogStateContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}

export function useCatalogDispatch(): React.Dispatch<CatalogAction> {
  // 更新用フック。Provider 外での使用を防止
  const ctx = useContext(CatalogDispatchContext);
  if (!ctx) throw new Error('useCatalogDispatch must be used within CatalogProvider');
  return ctx;
}
