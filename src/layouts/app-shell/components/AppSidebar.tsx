import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  ExternalLink,
  FolderOpen,
  MessagesSquare,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  RefreshCw,
  Settings,
} from 'lucide-react';
import type { ActivePage } from '../types';
import SidebarButton, { type SidebarIconProps } from './SidebarButton';
import SidebarSectionLabel from './SidebarSectionLabel';
import aviutl2Icon from '../../../../src-tauri/icons/aviutl2.png';
import appIcon from '../../../../src-tauri/icons/icon.svg';

interface AppSidebarProps {
  isSidebarCollapsed: boolean;
  activePage: ActivePage;
  updateAvailableCount: number;
  onGoHome: () => void;
  onGoUpdates: () => void;
  onGoRegister: () => void;
  onGoNiconiCommons: () => void;
  onGoFeedback: () => void;
  onGoSettings: () => void;
  onOpenDataDir: () => void | Promise<void>;
  onLaunchAviUtl2: () => void | Promise<void>;
  onToggleSidebar: () => void;
}

function AviUtlIcon({ size, className }: SidebarIconProps) {
  const iconStyle = useMemo<CSSProperties>(() => ({ width: size, height: size }), [size]);
  return <img src={aviutl2Icon} alt="AviUtl2" style={iconStyle} className={className} />;
}

const niconiCommonsIcon = (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M19.213 4.724h-5.816l2.388-2.275a.852.852 0 00.041-1.182.802.802 0 00-1.153-.043L11 4.724l-3.673-3.5a.802.802 0 00-1.153.043.85.85 0 00.042 1.182l2.387 2.275H2.788A1.8 1.8 0 001 6.535v10.863c0 1 .802 1.812 1.788 1.812h2.266l1.35 1.59a.518.518 0 00.816 0l1.35-1.59h4.86l1.35 1.59a.518.518 0 00.816 0l1.35-1.59h2.266c.99 0 1.788-.811 1.788-1.812V6.535c0-1-.799-1.81-1.787-1.81" />
  </svg>
);

export default function AppSidebar({
  isSidebarCollapsed,
  activePage,
  updateAvailableCount,
  onGoHome,
  onGoUpdates,
  onGoRegister,
  onGoNiconiCommons,
  onGoFeedback,
  onGoSettings,
  onOpenDataDir,
  onLaunchAviUtl2,
  onToggleSidebar,
}: AppSidebarProps) {
  return (
    <aside
      className={`${isSidebarCollapsed ? 'w-20' : 'w-66'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-30 transition-all duration-300 ease-in-out select-none`}
    >
      <div className="border-b border-slate-100 dark:border-slate-800 h-16 flex items-center shrink-0 overflow-hidden">
        <div className="w-20 shrink-0 flex items-center justify-center">
          <img src={appIcon} alt="AviUtl2カタログ" className="h-7 w-7 object-contain" />
        </div>
        {!isSidebarCollapsed ? (
          <div className="flex-1 flex items-center min-w-0 pr-4">
            <span className="font-bold text-lg text-slate-900 dark:text-slate-50 truncate tracking-tight">
              AviUtl2カタログ
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-3 space-y-1">
          <SidebarSectionLabel label="メインメニュー" isCollapsed={isSidebarCollapsed} hideDivider className="mb-1" />

          <SidebarButton
            icon={PackageSearch}
            label="パッケージ一覧"
            isActive={activePage === 'home'}
            isCollapsed={isSidebarCollapsed}
            onClick={onGoHome}
            shortcut="Alt+P"
          />

          <SidebarButton
            icon={RefreshCw}
            label="アップデートセンター"
            isActive={activePage === 'updates'}
            isCollapsed={isSidebarCollapsed}
            onClick={onGoUpdates}
            badgeCount={updateAvailableCount}
            shortcut="Alt+U"
          />

          <SidebarButton
            icon={niconiCommonsIcon}
            label="ニコニコモンズ"
            variant="ghost"
            isActive={activePage === 'niconi-commons'}
            isCollapsed={isSidebarCollapsed}
            onClick={onGoNiconiCommons}
          />

          <SidebarButton
            icon={PlusCircle}
            label="パッケージ登録"
            variant="ghost"
            isActive={activePage === 'register'}
            isCollapsed={isSidebarCollapsed}
            onClick={onGoRegister}
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
              onClick={onLaunchAviUtl2}
              shortcut="Alt+L"
              rightIcon={ExternalLink}
            />

            <SidebarButton
              icon={FolderOpen}
              label="データフォルダを開く"
              isActive={false}
              isCollapsed={isSidebarCollapsed}
              onClick={onOpenDataDir}
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
          onClick={onGoFeedback}
          shortcut="Alt+F"
        />
        <SidebarButton
          icon={Settings}
          label="設定"
          variant="ghost"
          isActive={activePage === 'settings'}
          isCollapsed={isSidebarCollapsed}
          onClick={onGoSettings}
          shortcut="Alt+S"
        />
        <SidebarButton
          icon={isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose}
          label={isSidebarCollapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
          variant="ghost"
          isCollapsed={isSidebarCollapsed}
          onClick={onToggleSidebar}
          shortcut="Alt+B"
        />
      </div>
    </aside>
  );
}
