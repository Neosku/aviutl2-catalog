import type { ComponentType } from 'react';
import type { ParseKeys } from 'i18next';
import {
  ExternalLink,
  FolderOpen,
  Link,
  MessagesSquare,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  RefreshCw,
  Settings,
} from 'lucide-react';
import aviutl2Icon from '../../../src-tauri/icons/aviutl2.png';
import type { SidebarButtonVariant, SidebarIconProps, SidebarIconType } from './components/SidebarButton';
import { type ActivePage, HOME_LIST_RESTORE_STATE } from './types';

type SidebarRoutePage = Exclude<ActivePage, '' | 'package'>;
type SidebarRouteMatchMode = 'exact' | 'prefix';

export type SidebarActionId =
  | 'home'
  | 'links'
  | 'updates'
  | 'niconi-commons'
  | 'register'
  | 'launch-aviutl2'
  | 'open-data-dir'
  | 'feedback'
  | 'settings'
  | 'toggle-sidebar';

export type SidebarActionHandler = () => void | Promise<void>;
export type SidebarActionHandlers = Record<SidebarActionId, SidebarActionHandler>;

interface SidebarShortcutDefinition {
  code: KeyboardEvent['code'];
  label: string;
}

interface SidebarRenderContext {
  activePage: ActivePage;
  isSidebarCollapsed: boolean;
  updateAvailableCount: number;
  t: (key: SidebarTranslationKey) => string;
}

export type SidebarTranslationKey = ParseKeys<'nav'>;

type SidebarItemLabelDefinition =
  | {
      labelKey: SidebarTranslationKey;
      getLabel?: never;
    }
  | {
      labelKey?: never;
      getLabel: (context: SidebarRenderContext) => string;
    };

type SidebarItemIconDefinition =
  | {
      icon: SidebarIconType;
      getIcon?: never;
    }
  | {
      icon?: never;
      getIcon: (context: SidebarRenderContext) => SidebarIconType;
    };

type SidebarItemDefinition = SidebarItemLabelDefinition &
  SidebarItemIconDefinition & {
    id: SidebarActionId;
    variant?: SidebarButtonVariant;
    page?: SidebarRoutePage;
    path?: string;
    matchMode?: SidebarRouteMatchMode;
    badgeCount?: number;
    getBadgeCount?: (context: SidebarRenderContext) => number;
    shortcut?: SidebarShortcutDefinition;
    rightIcon?: ComponentType<{ size?: number; className?: string }>;
  };

type SidebarRouteItemDefinition = SidebarItemDefinition & {
  page: SidebarRoutePage;
  path: string;
  matchMode?: SidebarRouteMatchMode;
};

export interface SidebarSectionDefinition {
  id: 'main-menu' | 'shortcuts' | 'app';
  label?: SidebarTranslationKey;
  className?: string;
  labelClassName?: string;
  hideDivider?: boolean;
  items: readonly SidebarItemDefinition[];
}

export interface ResolvedSidebarItemDefinition {
  id: SidebarActionId;
  label: string;
  icon: SidebarIconType;
  variant: SidebarButtonVariant;
  isActive: boolean;
  badgeCount: number;
  shortcut?: string;
  rightIcon?: ComponentType<{ size?: number; className?: string }>;
}

function AviUtlIcon({ size = 20, className }: SidebarIconProps) {
  return <img src={aviutl2Icon} alt="AviUtl2" width={size} height={size} className={className} />;
}

const niconiCommonsIcon = (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M19.213 4.724h-5.816l2.388-2.275a.852.852 0 00.041-1.182.802.802 0 00-1.153-.043L11 4.724l-3.673-3.5a.802.802 0 00-1.153.043.85.85 0 00.042 1.182l2.387 2.275H2.788A1.8 1.8 0 001 6.535v10.863c0 1 .802 1.812 1.788 1.812h2.266l1.35 1.59a.518.518 0 00.816 0l1.35-1.59h4.86l1.35 1.59a.518.518 0 00.816 0l1.35-1.59h2.266c.99 0 1.788-.811 1.788-1.812V6.535c0-1-.799-1.81-1.787-1.81" />
  </svg>
);

const homeSidebarItem = {
  id: 'home',
  labelKey: 'navigation.home',
  icon: PackageSearch,
  page: 'home',
  path: '/',
  matchMode: 'exact',
  shortcut: { code: 'KeyP', label: 'Alt+P' },
} as const satisfies SidebarRouteItemDefinition;

const updatesSidebarItem = {
  id: 'updates',
  labelKey: 'navigation.updates',
  icon: RefreshCw,
  page: 'updates',
  path: '/updates',
  getBadgeCount: ({ updateAvailableCount }) => updateAvailableCount,
  shortcut: { code: 'KeyU', label: 'Alt+U' },
} as const satisfies SidebarRouteItemDefinition;

const linksSidebarItem = {
  id: 'links',
  labelKey: 'navigation.links',
  icon: Link,
  page: 'links',
  path: '/links',
  variant: 'ghost',
  shortcut: { code: 'KeyL', label: 'Alt+L' },
} as const satisfies SidebarRouteItemDefinition;

const niconiCommonsSidebarItem = {
  id: 'niconi-commons',
  labelKey: 'navigation.niconiCommons',
  icon: niconiCommonsIcon,
  page: 'niconi-commons',
  path: '/niconi-commons',
  variant: 'ghost',
  shortcut: { code: 'KeyN', label: 'Alt+N' },
} as const satisfies SidebarRouteItemDefinition;

const registerSidebarItem = {
  id: 'register',
  labelKey: 'navigation.register',
  icon: PlusCircle,
  page: 'register',
  path: '/register',
  variant: 'ghost',
  shortcut: { code: 'KeyR', label: 'Alt+R' },
} as const satisfies SidebarRouteItemDefinition;

const feedbackSidebarItem = {
  id: 'feedback',
  labelKey: 'navigation.feedback',
  icon: MessagesSquare,
  page: 'feedback',
  path: '/feedback',
  variant: 'ghost',
  shortcut: { code: 'KeyF', label: 'Alt+F' },
} as const satisfies SidebarRouteItemDefinition;

const settingsSidebarItem = {
  id: 'settings',
  labelKey: 'navigation.settings',
  icon: Settings,
  page: 'settings',
  path: '/settings',
  variant: 'ghost',
  shortcut: { code: 'KeyS', label: 'Alt+S' },
} as const satisfies SidebarRouteItemDefinition;

const SIDEBAR_ROUTE_ITEMS = [
  homeSidebarItem,
  updatesSidebarItem,
  linksSidebarItem,
  niconiCommonsSidebarItem,
  registerSidebarItem,
  feedbackSidebarItem,
  settingsSidebarItem,
] as const;

type SidebarRouteActionId = (typeof SIDEBAR_ROUTE_ITEMS)[number]['id'];

export const SIDEBAR_SECTIONS: readonly SidebarSectionDefinition[] = [
  {
    id: 'main-menu',
    label: 'sections.mainMenu',
    labelClassName: 'mb-1',
    hideDivider: true,
    items: [homeSidebarItem, updatesSidebarItem, linksSidebarItem, niconiCommonsSidebarItem, registerSidebarItem],
  },
  {
    id: 'shortcuts',
    label: 'sections.shortcuts',
    className: 'pt-2',
    labelClassName: 'mt-2 mb-1',
    items: [
      {
        id: 'launch-aviutl2',
        labelKey: 'items.launchAviutl2',
        icon: AviUtlIcon,
        shortcut: { code: 'KeyA', label: 'Alt+A' },
        rightIcon: ExternalLink,
      },
      {
        id: 'open-data-dir',
        labelKey: 'items.openDataDir',
        icon: FolderOpen,
        shortcut: { code: 'KeyD', label: 'Alt+D' },
        rightIcon: ExternalLink,
      },
    ],
  },
  {
    id: 'app',
    className: 'mt-auto border-t border-slate-200 pt-3 dark:border-slate-800',
    items: [
      feedbackSidebarItem,
      settingsSidebarItem,
      {
        id: 'toggle-sidebar',
        getLabel: ({ isSidebarCollapsed, t }) =>
          isSidebarCollapsed ? t('items.openSidebar') : t('items.closeSidebar'),
        getIcon: ({ isSidebarCollapsed }) => (isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose),
        variant: 'ghost',
        shortcut: { code: 'KeyB', label: 'Alt+B' },
      },
    ],
  },
];

export const SIDEBAR_SHORTCUTS = SIDEBAR_SECTIONS.flatMap((section) =>
  section.items.flatMap((item) => (item.shortcut ? [{ id: item.id, shortcut: item.shortcut }] : [])),
);

function matchesSidebarRoute(pathname: string, item: SidebarRouteItemDefinition): boolean {
  if (item.matchMode === 'exact') return pathname === item.path;
  return pathname.startsWith(item.path);
}

export function resolveAppShellActivePage(pathname: string): ActivePage {
  const matchedRoute = SIDEBAR_ROUTE_ITEMS.find((item) => matchesSidebarRoute(pathname, item));
  if (matchedRoute) return matchedRoute.page;
  if (pathname.startsWith('/package')) return 'package';
  return '';
}

export function createSidebarRouteActionHandlers(
  navigate: (path: string, options?: { state?: unknown }) => void,
): Pick<SidebarActionHandlers, SidebarRouteActionId> {
  return {
    home: () => navigate(homeSidebarItem.path, { state: HOME_LIST_RESTORE_STATE }),
    links: () => navigate(linksSidebarItem.path),
    updates: () => navigate(updatesSidebarItem.path),
    'niconi-commons': () => navigate(niconiCommonsSidebarItem.path),
    register: () => navigate(registerSidebarItem.path),
    feedback: () => navigate(feedbackSidebarItem.path),
    settings: () => navigate(settingsSidebarItem.path),
  };
}

export function resolveSidebarItem(
  item: SidebarItemDefinition,
  context: SidebarRenderContext,
): ResolvedSidebarItemDefinition {
  return {
    id: item.id,
    label: item.getLabel ? item.getLabel(context) : context.t(item.labelKey),
    icon: item.getIcon ? item.getIcon(context) : item.icon,
    variant: item.variant ?? 'default',
    isActive: item.page ? context.activePage === item.page : false,
    badgeCount: item.getBadgeCount ? item.getBadgeCount(context) : (item.badgeCount ?? 0),
    shortcut: item.shortcut?.label,
    rightIcon: item.rightIcon,
  };
}
