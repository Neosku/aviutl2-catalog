import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search,
  X,
  FolderOpen,
  Settings,
  PlusCircle,
  MessagesSquare,
  RefreshCw,
  PackageSearch,
  CheckCircle2,
  Box,
  Tags,
  Layers,

  PanelLeftClose,
  PanelLeftOpen,

  ListFilter,
  ExternalLink,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useCatalog } from '../utils/catalogStore.jsx';
import { filterByTagsAndType, getSorter, matchQuery } from '../utils/index.js';
import ErrorDialog from './ErrorDialog.jsx';
import aviutl2Icon from '../../src-tauri/icons/aviutl2.png';
import appIcon from '../../src-tauri/icons/icon.svg';

export const SORT_OPTIONS = [
  { value: 'popularity_desc', label: '人気順' },
  { value: 'trend_desc', label: 'トレンド順' },
  { value: 'added_desc', label: '新着順' },
  { value: 'updated_desc', label: '最終更新日順' },
];

function sortOrderFromQuery(sortKey, dir) {
  if (sortKey === 'popularity') return 'popularity_desc';
  if (sortKey === 'trend') return 'trend_desc';
  if (sortKey === 'added') return 'added_desc';
  if (sortKey === 'newest') return 'updated_desc';
  return 'popularity_desc';
}

function sortParamsFromOrder(order) {
  switch (order) {
    case 'popularity_desc':
      return { sortKey: 'popularity', dir: 'desc' };
    case 'trend_desc':
      return { sortKey: 'trend', dir: 'desc' };
    case 'added_desc':
      return { sortKey: 'added', dir: 'desc' };
    case 'updated_desc':
    default:
      return { sortKey: 'newest', dir: 'desc' };
  }
}

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// Global state for tooltip grouping (fast-pass)
let globalTooltipRecent = false;
let globalTooltipTimer = null;

const warmTooltip = () => {
  globalTooltipRecent = true;
  if (globalTooltipTimer) clearTimeout(globalTooltipTimer);
};

const coolTooltip = () => {
  if (globalTooltipTimer) clearTimeout(globalTooltipTimer);
  globalTooltipTimer = setTimeout(() => {
    globalTooltipRecent = false;
  }, 500);
};

function PortalTooltip({ text, rect }) {
  if (!rect || !text) return null;

  const top = rect.top + rect.height / 2;
  const left = rect.right + 12;

  return createPortal(
    <div
      className="fixed z-[9999] px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-md shadow-xl font-sans border border-slate-700 dark:border-slate-600 pointer-events-none whitespace-nowrap"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateY(-50%)',
      }}
    >
      {text}
    </div>,
    document.body
  );
}

function SidebarButton({ icon, label, onClick, isActive, isCollapsed, variant = 'default', badgeCount = 0, shortcut, rightIcon: RightIcon }) {
  const [hoverRect, setHoverRect] = useState(null);
  const buttonRef = useRef(null);
  const timerRef = useRef(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = globalTooltipRecent ? 50 : 500;
    timerRef.current = setTimeout(() => {
      if (buttonRef.current) {
        setHoverRect(buttonRef.current.getBoundingClientRect());
        warmTooltip();
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hoverRect) coolTooltip();
    setHoverRect(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const baseClasses = `group relative w-full flex items-center rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer overflow-hidden py-3 h-11 text-left`;
  const variants = {
    default: isActive
      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800',
    action: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    ghost: isActive
      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800',
  };

  const iconClass = `shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`;
  const iconElement = React.isValidElement(icon)
    ? React.cloneElement(icon, {
      className: `${icon.props?.className || ''} ${iconClass}`.trim(),
      'aria-hidden': icon.props?.['aria-hidden'] ?? true,
    })
    : (icon ? React.createElement(icon, { size: 20, className: iconClass }) : null);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${baseClasses} ${variants[variant]}`}
        type="button"
      >
        <div className="w-14 shrink-0 flex items-center justify-center">
          {iconElement}
        </div>
        {!isCollapsed && <span className="truncate flex-1 pr-2">{label}</span>}
        {!isCollapsed && RightIcon && <RightIcon size={18} className="opacity-50 shrink-0 mr-3" />}
        {!isCollapsed && badgeCount > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold min-w-5 h-5 flex items-center justify-center rounded-full shadow-sm dark:shadow-red-900/20 px-1 mr-3">
            {badgeCount}
          </span>
        )}
        {isCollapsed && badgeCount > 0 && (
          <span className="absolute top-1.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900" />
        )}
      </button>
      {shortcut && <PortalTooltip text={`${label} (${shortcut})`} rect={hoverRect} />}
    </>
  );
}

function usePortalTooltip(shortcut) {
  const [hoverRect, setHoverRect] = useState(null);
  const ref = useRef(null);
  const timerRef = useRef(null);

  const onMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = globalTooltipRecent ? 50 : 500;
    timerRef.current = setTimeout(() => {
      if (ref.current) {
        setHoverRect(ref.current.getBoundingClientRect());
        warmTooltip();
      }
    }, delay);
  };

  const onMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hoverRect) coolTooltip();
    setHoverRect(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const tooltip = shortcut ? <PortalTooltip text={shortcut} rect={hoverRect} /> : null;

  return { ref, onMouseEnter, onMouseLeave, tooltip };
}

// function TagButton({ label, selected, onClick }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`px-2 py-1 text-[10px] rounded border transition-all text-left truncate max-w-full ${
//         selected
//           ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 shadow-sm font-medium'
//           : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
//       }`}
//       type="button"
//     >
//       {label}
//     </button>
//   );
// }
function TagButton({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-2 py-1 text-[10px] rounded border text-left max-w-full
        truncate whitespace-nowrap cursor-pointer
        transition-colors transition-shadow ${selected
          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 shadow-sm'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
        }`}
    >
      {/* 幅確保用（見えない太字）。レイアウトには参加する */}
      <span className="invisible font-medium truncate block">{label}</span>

      {/* 実表示（上に重ねる） */}
      <span
        className={`absolute inset-0 px-2 py-1 truncate ${selected ? 'font-medium' : 'font-normal'
          }`}
      >
        {label}
      </span>
    </button>
  );
}

const AviUtlIcon = ({ size, className }) => (
  <img src={aviutl2Icon} alt="AviUtl2" style={{ width: size, height: size }} className={className} />
);

function SidebarSectionLabel({ label, isCollapsed, hideDivider = false, className = "" }) {
  return (
    <div className={`h-4 flex items-center shrink-0 transition-all duration-200 ${className} ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}>
      {isCollapsed ? (
        !hideDivider && <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800" />
      ) : (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap overflow-hidden block">
          {label}
        </span>
      )}
    </div>
  );
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, allTags, allTypes } = useCatalog();
  const [error, setError] = useState('');
  const scrollContainerRef = useRef(null);
  const homeScrollRef = useRef(0);

  const folderTooltip = usePortalTooltip('データフォルダを開く (Alt+O)');
  const launchTooltip = usePortalTooltip('AviUtl2を起動 (Alt+L)');
  const sidebarCloseTooltip = usePortalTooltip('サイドバーを閉じる (Alt+B)');
  const sidebarOpenTooltip = usePortalTooltip('サイドバーを開く (Alt+B)');

  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const parseQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    let sortKey = params.get('sort') || 'popularity';
    if (!['popularity', 'newest', 'trend', 'added'].includes(sortKey)) {
      sortKey = 'popularity';
    }
    const dir = sortKey === 'newest' ? 'desc' : (params.get('dir') || 'desc');
    const type = params.get('type') || '';
    const tags = (params.get('tags') || '').split(',').filter(Boolean);
    const installed = params.get('installed') === '1';
    return { q, sortKey, dir, type, tags, installed };
  }, [location.search]);

  // Derived state from URL (Single Source of Truth)
  const filterInstalled = parseQuery.installed;
  const selectedCategory = parseQuery.type || 'すべて';
  const selectedTags = parseQuery.tags;
  const sortOrder = sortOrderFromQuery(parseQuery.sortKey, parseQuery.dir);

  // 検索入力はローカル状態で管理し、毎キーのURL更新を避ける
  const [searchQuery, setSearchQuery] = useState(parseQuery.q);
  const debouncedQuery = useDebouncedValue(searchQuery, 250);
  const isHome = location.pathname === '/';

  // URL変更（戻る操作など）に追従して検索入力を同期
  useEffect(() => {
    if (!isHome) return;
    if (parseQuery.q !== searchQuery) {
      setSearchQuery(parseQuery.q);
    }
  }, [isHome, parseQuery.q]);

  useEffect(() => {
    const isPackageDetail = location.pathname.startsWith('/package/');
    if (location.pathname !== '/' && !isPackageDetail) {
      setSearchQuery('');
    }
  }, [location.pathname]);

  // Helper to update URL params
  const updateUrl = (overrides) => {
    const params = new URLSearchParams(location.search);
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else if (Array.isArray(value)) {
        if (value.length > 0) params.set(key, value.join(','));
        else params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // 他のフィルタ操作時に検索入力が巻き戻らないようURLを維持
    if (!('q' in overrides)) {
      if (searchQuery) params.set('q', searchQuery);
      else params.delete('q');
    }

    // Clean up defaults
    if (params.get('sort') === 'popularity') params.delete('sort');
    if (params.get('dir') === 'desc' && (!params.get('sort') || params.get('sort') === 'popularity')) params.delete('dir');

    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // 検索入力をデバウンスしてURLへ反映
  useEffect(() => {
    if (!isHome) return;
    if (debouncedQuery !== parseQuery.q) {
      updateUrl({ q: debouncedQuery });
    }
  }, [debouncedQuery, isHome]);

  useEffect(() => {
    if (!isHome) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      homeScrollRef.current = el.scrollTop;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useLayoutEffect(() => {
    if (!isHome) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const previous = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollTop = homeScrollRef.current || 0;
    el.style.scrollBehavior = previous;
  }, [isHome]);

  const categories = useMemo(() => ['すべて', ...(allTypes || [])], [allTypes]);

  const filteredPackages = useMemo(() => {
    const base = searchQuery ? items.filter(item => matchQuery(item, searchQuery)) : items;
    const category = selectedCategory === 'すべて' ? '' : selectedCategory;
    const afterTag = filterByTagsAndType(base, selectedTags, category ? [category] : []);
    const afterInstalled = filterInstalled ? afterTag.filter(item => item.installed) : afterTag;
    const sorter = getSorter(parseQuery.sortKey, parseQuery.dir);
    return [...afterInstalled].sort(sorter);
  }, [items, searchQuery, selectedTags, selectedCategory, filterInstalled, parseQuery]);

  const isFilterActive = filterInstalled || selectedCategory !== 'すべて' || selectedTags.length > 0;
  const updateAvailableCount = useMemo(() => items.filter(item => item.installed && !item.isLatest).length, [items]);

  const toggleTag = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    updateUrl({ tags: newTags });
  };

  const clearFilters = () => {
    setSearchQuery('');
    navigate(location.pathname, { replace: true });
  };

  const setSortOrder = (order) => {
    const { sortKey, dir } = sortParamsFromOrder(order);
    updateUrl({ sort: sortKey, dir });
  };

  async function openDataDir() {
    try {
      const dirs = await invoke('get_app_dirs');
      const target = (dirs && typeof dirs.aviutl2_data === 'string') ? dirs.aviutl2_data.trim() : '';
      if (!target) {
        setError('データフォルダの場所を取得できませんでした。設定画面で AviUtl2 のフォルダを確認してください。');
        return;
      }
      const shell = await import('@tauri-apps/plugin-shell');
      if (shell?.Command?.create) {
        const cmd = shell.Command.create('explorer', [target]);
        await cmd.execute();
        return;
      }
      setError('エクスプローラーを起動できませんでした。');
    } catch (e) {
      setError('データフォルダを開けませんでした。設定を確認してください。');
    }
  }

  async function launchAviUtl2() {
    try {
      await invoke('launch_aviutl2');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'AviUtl2 の起動に失敗しました。');
    }
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.altKey) {
        switch (e.code) {
          case 'KeyP': // Package List
            e.preventDefault();
            navigate('/');
            break;
          case 'KeyU': // Updates
            e.preventDefault();
            navigate('/updates');
            break;
          case 'KeyR': // Register
            e.preventDefault();
            navigate('/register');
            break;
          case 'KeyF': // Feedback
            e.preventDefault();
            navigate('/feedback');
            break;
          case 'KeyO': // Open Folder
            e.preventDefault();
            openDataDir();
            break;
          case 'KeyL': // Launch
            e.preventDefault();
            launchAviUtl2();
            break;
          case 'KeyS': // Settings
            e.preventDefault();
            navigate('/settings');
            break;
          case 'KeyB': // Sidebar Toggle
            e.preventDefault();
            setSidebarCollapsed(prev => !prev);
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, openDataDir, isHome, setSidebarCollapsed]);

  const activePath = location.pathname;
  const activePage = activePath === '/'
    ? 'home'
    : activePath.startsWith('/updates')
      ? 'updates'
      : activePath.startsWith('/register')
        ? 'register'
        : activePath.startsWith('/niconi-commons')
          ? 'niconi-commons'
          : activePath.startsWith('/feedback')
            ? 'feedback'
            : activePath.startsWith('/settings')
              ? 'settings'
              : activePath.startsWith('/package')
                ? 'package'
                : '';

  // ニコニ・コモンズ用のインラインSVG（枠線のみ）
  const niconiCommonsIcon = (
    <svg
      viewBox="0 0 22 22"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M19.213 4.724h-5.816l2.388-2.275a.852.852 0 00.041-1.182.802.802 0 00-1.153-.043L11 4.724l-3.673-3.5a.802.802 0 00-1.153.043.85.85 0 00.042 1.182l2.387 2.275H2.788A1.8 1.8 0 001 6.535v10.863c0 1 .802 1.812 1.788 1.812h2.266l1.35 1.59a.518.518 0 00.816 0l1.35-1.59h4.86l1.35 1.59a.518.518 0 00.816 0l1.35-1.59h2.266c.99 0 1.788-.811 1.788-1.812V6.535c0-1-.799-1.81-1.787-1.81" />
    </svg>
  );

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 overflow-hidden">
      <aside
        className={`${isSidebarCollapsed ? 'w-20' : 'w-66'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-30 transition-all duration-300 ease-in-out select-none`}
      >
        <div className="border-b border-slate-100 dark:border-slate-800 h-16 flex items-center shrink-0 overflow-hidden">
          <div className="w-20 shrink-0 flex items-center justify-center">
            <img src={appIcon} alt="AviUtl2カタログ" className="h-7 w-7 object-contain" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 flex items-center min-w-0 pr-4">
              <span className="font-bold text-lg text-slate-900 dark:text-slate-50 truncate tracking-tight">AviUtl2カタログ</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-3 space-y-1">
            <SidebarSectionLabel label="メインメニュー" isCollapsed={isSidebarCollapsed} hideDivider className="mb-1" />

            <SidebarButton
              icon={PackageSearch}
              label="パッケージ一覧"
              isActive={activePage === 'home'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => navigate('/')}
              shortcut="Alt+P"
            />

            <SidebarButton
              icon={RefreshCw}
              label="アップデートセンター"
              isActive={activePage === 'updates'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => navigate('/updates')}
              badgeCount={updateAvailableCount}
              shortcut="Alt+U"
            />

            <SidebarButton
              icon={niconiCommonsIcon}
              label="ニコニコモンズ"
              variant="ghost"
              isActive={activePage === 'niconi-commons'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => navigate('/niconi-commons')}
            />

            <SidebarButton
              icon={PlusCircle}
              label="パッケージ登録"
              variant="ghost"
              isActive={activePage === 'register'}
              isCollapsed={isSidebarCollapsed}
              onClick={() => navigate('/register')}
              shortcut="Alt+R"
            />
          </div>

          <div className="p-3 pt-2 mt-auto sm:mt-0">
            <div className="space-y-1">
              <SidebarSectionLabel label="ショートカット" isCollapsed={isSidebarCollapsed} className="mt-2 mb-1" />

              <SidebarButton
                icon={AviUtlIcon}
                label="AviUtl2を起動"
                isActive={false}
                isCollapsed={isSidebarCollapsed}
                onClick={launchAviUtl2}
                shortcut="Alt+L"
                rightIcon={ExternalLink}
              />

              <SidebarButton
                icon={FolderOpen}
                label="データフォルダを開く"
                isActive={false}
                isCollapsed={isSidebarCollapsed}
                onClick={openDataDir}
                shortcut="Alt+O"
                rightIcon={ExternalLink}
              />
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col gap-1">
          <SidebarButton
            icon={MessagesSquare}
            label="フィードバック"
            variant="ghost"
            isActive={activePage === 'feedback'}
            isCollapsed={isSidebarCollapsed}
            onClick={() => navigate('/feedback')}
            shortcut="Alt+F"
          />
          <SidebarButton
            icon={Settings}
            label="設定"
            variant="ghost"
            isActive={activePage === 'settings'}
            isCollapsed={isSidebarCollapsed}
            onClick={() => navigate('/settings')}
            shortcut="Alt+S"
          />
          <SidebarButton
            icon={isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose}
            label={isSidebarCollapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
            variant="ghost"
            isCollapsed={isSidebarCollapsed}
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            shortcut="Alt+B"
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        {isHome && (
          <header className="h-16 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 gap-4 sticky top-0 z-10 transition-all select-none">
            <div className="flex items-center gap-3 flex-1 max-w-2xl relative">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="パッケージ名、作者、キーワードで検索..."
                  className="w-full pl-10 pr-10 py-2 bg-white/95 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {/* Sort button removed */}
          </header>
        )}

        <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto scroll-smooth px-6 pb-6 [scrollbar-gutter:stable] ${activePage === 'home' ? 'pt-0' : 'pt-6'}`}>
          <Outlet
            context={{
              filteredPackages,
              searchQuery,
              selectedCategory,
              clearFilters,
              isFilterActive,
              updateAvailableCount,
              sortOrder,
              setSortOrder,
              // Exposed for Home.jsx filter bar
              categories,
              allTags,
              selectedTags,
              filterInstalled,
              toggleTag,
              updateUrl, // Expose updateUrl to allow direct parameter updates
            }}
          />
        </div>
      </main>
      <ErrorDialog open={!!error} message={error} onClose={() => setError('')} />
    </div>
  );
}

export function useHomeContext() {
  return useOutletContext();
}
