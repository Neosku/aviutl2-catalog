// プラグイン一覧をアプリ全体で共有するためのストア
// React Context + useReducer で軽量に状態を管理します。
// - items: 画面に表示するパッケージ配列（正規化済みの派生フィールドを含む）
// - loading/error: ローディング・エラー状態
// - allTags/allTypes: UI のフィルター候補（全件から抽出）
// - installedMap/detectedMap: インストール情報（検出結果）
import React, { createContext, useReducer, useContext, useMemo } from 'react';
import { normalize, latestVersionOf } from '../utils.js';

// 読み取り用/更新用の Context を分離して、再レンダリングを最小化
const CatalogStateContext = createContext(null);
const CatalogDispatchContext = createContext(null);

// 更新日のタイムスタンプを算出
// 仕様: version[].release_date の最大値を updatedAt として使用
function toUpdatedAt(pkg) {
  const arr = Array.isArray(pkg.versions) ? pkg.versions : (Array.isArray(pkg.version) ? pkg.version : []);
  if (!arr.length) return null;
  const last = arr[arr.length - 1];
  const ts = new Date(last.release_date).getTime();
  return Number.isFinite(ts) ? ts : null;
}

// 検索・ソート用の派生フィールドを付与
// - updatedAt: 日付の数値化
// - nameKey/authorKey/summaryKey: 正規化キー（部分一致検索に利用）
function enrich(item) {
  return {
    ...item,
    updatedAt: toUpdatedAt(item),
    nameKey: normalize(item.name || ''),
    authorKey: normalize(item.author || ''),
    summaryKey: normalize(item.summary || ''),
  };
}

export function initCatalog() {
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

function catalogReducerInternal(state, action) {
  switch (action.type) {
    case 'SET_ITEMS': {
      // カタログ本体の差し替え
      // - installer があるものは downloadURL を installer:// に置き換え（UI でインストーラ起動）
      // - detectedMap（検出済みバージョン）から installed/isLatest を付加
      const items = (action.payload || []).map(enrich).map(it => {
        const hasInst = (typeof it?.installer === 'string') || Array.isArray(it?.installer?.install);
        const dl = hasInst ? `installer://${encodeURIComponent(it.id)}` : it.downloadURL;
        const detectedVersion = state.detectedMap?.[it.id] || '';
        const latest = latestVersionOf(it) || '';
        const isLatest = !!detectedVersion && !!latest && detectedVersion === latest;
        return {
          ...it,
          downloadURL: dl,
          installed: detectedVersion !== '',
          installedVersion: detectedVersion,
          isLatest,
        };
      });
      // タグ・種類の候補一覧を集計（重複排除）
      const tagSet = new Set();
      const typeSet = new Set();
      items.forEach(it => {
        (it.tags || []).forEach(t => tagSet.add(t));
        if (it.type) typeSet.add(it.type);
      });
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
      const items = state.items.map(it => it);
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
      const items = state.items.map(it => {
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
      const detectedMap = { ...(state.detectedMap || {}) };
      if (id) detectedMap[id] = version || '';
      const items = state.items.map(it => {
        const v = (it.id === id) ? (version || '') : (state.detectedMap?.[it.id] || '');
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

export function CatalogProvider({ children, init }) {
  // Provider で reducer を構築。state は useMemo でメモ化し不要な再描画を抑制
  const [state, dispatch] = useReducer(catalogReducerInternal, init);
  const memoState = useMemo(() => state, [state]);
  return (
    <CatalogDispatchContext.Provider value={dispatch}>
      <CatalogStateContext.Provider value={memoState}>
        {children}
      </CatalogStateContext.Provider>
    </CatalogDispatchContext.Provider>
  );
}

export function useCatalog() {
  // 読み取り用フック。Provider 外での使用を防止
  const ctx = useContext(CatalogStateContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}

export function useCatalogDispatch() {
  // 更新用フック。Provider 外での使用を防止
  const ctx = useContext(CatalogDispatchContext);
  if (!ctx) throw new Error('useCatalogDispatch must be used within CatalogProvider');
  return ctx;
}
