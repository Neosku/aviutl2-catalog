const joinTokens = (...tokens: readonly string[]) => tokens.join(' ');

const surfaceBorder = {
  default: 'border border-slate-200 dark:border-slate-800',
  muted: 'border border-slate-200 dark:border-slate-700',
  danger: 'border border-red-200 dark:border-red-900/50',
  dangerSoft: 'border border-red-200 dark:border-red-900/40',
  dangerSubtle: 'border border-red-100 dark:border-red-900/30',
} as const;

const surfaceTone = {
  default: 'bg-white dark:bg-slate-900',
  raised: 'bg-white dark:bg-slate-800',
  muted: 'bg-slate-50 dark:bg-slate-800/50',
  mutedSoft: 'bg-slate-50/50 dark:bg-slate-800/20',
  mutedStrong: 'bg-slate-50 dark:bg-slate-800/70',
  header: 'bg-slate-50/50 dark:bg-slate-900/50',
  critical: 'bg-red-50 dark:bg-red-900/20',
} as const;

const surfaceRadius = {
  rounded: 'rounded',
  roundedLg: 'rounded-lg',
  roundedXl: 'rounded-xl',
  rounded2xl: 'rounded-2xl',
} as const;

const surfaceDepth = {
  shadow: 'shadow-sm',
  shadowStrong: 'shadow-2xl',
} as const;

const surfaceFlow = {
  overflowHidden: 'overflow-hidden',
} as const;

export const layout = {
  inlineGap1: 'inline-flex items-center gap-1',
  inlineGap1_5: 'flex items-center gap-1.5',
  inlineGap2: 'flex items-center gap-2',
  inlineGap3: 'flex items-center gap-3',
  inlineStartGap3: 'flex items-start gap-3',
  clickableInline: 'flex cursor-pointer items-center',
  stackGap1: 'space-y-1',
  stackGap2: 'space-y-2',
  stackGap3: 'space-y-3',
  stackGap4: 'space-y-4',
  stackGap6: 'space-y-6',
  stackGap8: 'space-y-8',
  rowBetweenGap2: 'flex items-center justify-between gap-2',
  wrapItemsGap1: 'flex flex-wrap items-center gap-1',
  wrapGap2: 'flex flex-wrap gap-2',
  wrapItemsGap2: 'flex flex-wrap items-center gap-2',
  wrapItemsGap3: 'flex flex-wrap items-center gap-3',
  rowBetweenWrapStartGap4: 'flex flex-wrap items-start justify-between gap-4',
  rowBetweenWrapGap2: 'flex flex-wrap items-center justify-between gap-2',
  rowBetweenWrapGap3: 'flex flex-wrap items-center justify-between gap-3',
  rowBetweenWrapGap4: 'flex flex-wrap items-center justify-between gap-4',
  sectionPadSm: 'px-4 py-3 text-sm',
  dividerRightMuted: 'border-r border-slate-200 pr-3 dark:border-slate-700',
  inputIconLeft: 'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400',
  modalWidthLg: 'relative w-full max-w-lg',
  fixedCenter: 'fixed inset-0 z-50 flex items-center justify-center p-4',
  fixedCenterBlur: 'fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
  center: 'flex items-center justify-center',
  centerCol: 'flex flex-col items-center justify-center',
  rowBetween: 'flex items-center justify-between',
  preWrapLead: 'whitespace-pre-wrap flex-1 font-medium leading-relaxed',
  footerWrapEndMuted:
    'flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50',
  pulseXs: 'animate-pulse text-xs text-slate-500',
  headerInlineStrong: 'mb-1 flex items-center gap-2 font-semibold',
  footerEnd: 'flex justify-end border-t border-slate-100 px-6 py-4 dark:border-slate-800',
} as const;

export const grid = {
  twoCol: 'grid gap-4 md:grid-cols-2',
  twoColWideGap: 'grid gap-6 md:grid-cols-2',
  panelTwoCol: 'grid gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 md:grid-cols-2',
} as const;

export const surface = {
  base: surfaceBorder.default,
  baseMuted: surfaceBorder.muted,
  toneDefault: surfaceTone.default,
  toneRaised: surfaceTone.raised,
  toneMuted: surfaceTone.muted,
  toneMutedSoft: surfaceTone.mutedSoft,
  toneMutedStrong: surfaceTone.mutedStrong,
  toneHeader: surfaceTone.header,
  toneCritical: surfaceTone.critical,
  rounded: surfaceRadius.rounded,
  roundedLg: surfaceRadius.roundedLg,
  roundedXl: surfaceRadius.roundedXl,
  rounded2xl: surfaceRadius.rounded2xl,
  shadow: surfaceDepth.shadow,
  shadowStrong: surfaceDepth.shadowStrong,
  overflowHidden: surfaceFlow.overflowHidden,

  card: joinTokens(surfaceRadius.rounded2xl, surfaceBorder.default, surfaceTone.default, surfaceDepth.shadow),
  cardOverflow: joinTokens(
    surfaceFlow.overflowHidden,
    surfaceRadius.rounded2xl,
    surfaceBorder.default,
    surfaceTone.default,
    surfaceDepth.shadow,
  ),
  modal: joinTokens(
    surfaceFlow.overflowHidden,
    surfaceRadius.rounded2xl,
    surfaceBorder.default,
    surfaceTone.default,
    surfaceDepth.shadowStrong,
  ),
  panel: joinTokens(surfaceTone.default, surfaceRadius.roundedXl, surfaceBorder.default, surfaceDepth.shadow),
  panelOverflow: joinTokens(
    surfaceTone.default,
    surfaceRadius.roundedXl,
    surfaceBorder.default,
    surfaceDepth.shadow,
    surfaceFlow.overflowHidden,
  ),
  panelSubtle: joinTokens(surfaceRadius.roundedXl, surfaceBorder.default, surfaceTone.muted),
  panelLg: joinTokens(surfaceRadius.roundedLg, surfaceBorder.muted, surfaceTone.raised),
  panelLgSubtle: joinTokens(surfaceRadius.roundedLg, surfaceBorder.default, surfaceTone.muted),
  panelLgSubtleSoft: joinTokens(surfaceRadius.roundedLg, surfaceBorder.default, surfaceTone.mutedSoft),
  panelRounded: joinTokens(surfaceRadius.rounded, surfaceBorder.muted, surfaceTone.default),
  panelRoundedSubtle: joinTokens(surfaceRadius.rounded, surfaceBorder.muted, surfaceTone.mutedStrong),
  infoBox: 'rounded-lg border px-4 py-3 text-sm',
  sectionDivider: 'border-b border-slate-100 px-6 py-4 dark:border-slate-800',
  cardSection: joinTokens(
    surfaceRadius.rounded2xl,
    surfaceBorder.default,
    surfaceTone.default,
    'p-6',
    surfaceDepth.shadow,
  ),
  cardSectionStack: joinTokens(
    'space-y-4',
    surfaceRadius.rounded2xl,
    surfaceBorder.default,
    surfaceTone.default,
    'p-6',
    surfaceDepth.shadow,
  ),
  cardSectionSpacious: joinTokens(
    'space-y-6',
    surfaceRadius.rounded2xl,
    surfaceBorder.default,
    surfaceTone.default,
    'p-6',
    surfaceDepth.shadow,
  ),
  sectionTopBorder: 'space-y-6 border-t border-slate-100 pt-6 dark:border-slate-800',
  sectionHeader:
    'px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2',
  modalHeaderMuted: joinTokens('border-b border-slate-100', surfaceTone.header, 'px-6 py-4 dark:border-slate-800'),
  overlayFade: 'absolute inset-0 bg-black/50 transition-opacity',
  softSelectable: joinTokens(
    'block cursor-pointer',
    surfaceRadius.roundedLg,
    surfaceBorder.default,
    surfaceTone.mutedSoft,
    'p-3',
  ),
  stepCard:
    'step-card group relative space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700',
  stepNumberBadge:
    'inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  dashedPlaceholder:
    'flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/50',
  dangerBox: joinTokens(
    surfaceRadius.roundedLg,
    surfaceBorder.danger,
    surfaceTone.critical,
    'p-3 text-red-700 dark:text-red-200',
  ),
  dangerAlert: joinTokens(
    surfaceRadius.roundedXl,
    surfaceBorder.dangerSoft,
    surfaceTone.critical,
    'px-4 py-3 text-sm text-red-700 dark:text-red-200',
  ),
  dangerText: joinTokens(
    'text-xs font-medium text-red-600',
    surfaceTone.critical,
    'p-3',
    surfaceRadius.roundedLg,
    surfaceBorder.dangerSubtle,
  ),
  dashedSoftPlaceholder:
    'rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400',
  divideMuted: 'divide-y divide-slate-100 dark:divide-slate-800',
} as const;

export const action = {
  outlineControl:
    'flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer',
  stepAddButton:
    'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  inlineToggleOption:
    'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
  dragHandle:
    'cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400',
  initSecondary:
    'h-11 px-8 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer',
  initPrimary: 'h-11 px-8 font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all',
  spinnerWhite: 'spinner border-white/30 border-t-white',
} as const;

export const overlay = {
  backdrop: 'absolute inset-0 bg-black/50',
} as const;

export const page = {
  container3xl: 'mx-auto max-w-3xl',
  container4xl: 'mx-auto max-w-4xl',
  container6xl: 'mx-auto max-w-6xl',
  selectNone: 'select-none',
  enterFromBottom: 'animate-in slide-in-from-bottom-2 duration-300',
  headerRow: 'mb-6 flex flex-wrap items-end justify-between gap-4',
  toolbarRow: 'mb-4 flex flex-wrap items-center justify-between gap-3',
} as const;

export const table = {
  scrollX: 'overflow-x-auto',
  headerBase:
    'px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide grid gap-2',
  rowBase: 'px-4 grid gap-2 items-center transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
  rowCompact: 'py-3',
  rowRelaxed: 'py-4',
  cellBodyTruncate: 'min-w-0 text-sm text-slate-600 dark:text-slate-300 truncate',
  actionButtonSubtle:
    'px-3 py-1.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed',
} as const;

export const text = {
  title2xl: 'text-2xl font-bold text-slate-900 dark:text-white',
  title2xlStrong: 'text-2xl font-bold text-slate-900 dark:text-slate-100',
  titleXl: 'text-xl font-bold text-slate-900 dark:text-slate-100',
  heroTitle: 'text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight',
  titleLg: 'text-lg font-bold text-slate-800 dark:text-slate-100',
  titleBaseBold: 'text-base font-bold text-slate-800 dark:text-slate-100',
  titleSmTruncate: 'font-semibold text-sm text-slate-800 dark:text-slate-100 truncate',
  headingSmBold: 'font-bold text-sm text-slate-700 dark:text-slate-200',
  labelSm: 'text-sm font-medium text-slate-700 dark:text-slate-300',
  mediumSlate: 'font-medium text-slate-700 dark:text-slate-300',
  labelXs: 'text-xs font-medium text-slate-600 dark:text-slate-400',
  labelXsSemibold: 'text-xs font-semibold text-slate-600 dark:text-slate-300',
  optionalMuted: 'text-xs font-normal text-slate-400',
  bodyXsStrong: 'text-xs text-slate-700 dark:text-slate-200',
  tinyMutedStrong: 'text-[10px] font-semibold text-slate-500 dark:text-slate-400',
  tinyMutedMt1: 'text-[10px] opacity-70 mt-1',
  semiboldMuted: 'font-semibold text-slate-600 dark:text-slate-300',
  bodySmMuted: 'text-sm text-slate-600 dark:text-slate-400',
  bodySmMutedAlt: 'text-sm text-slate-600 dark:text-slate-300',
  imageHeader: 'text-sm font-bold text-slate-700 dark:text-slate-200',
  disclosureChevron: 'text-slate-400 transition-transform group-open:rotate-180',
  mutedSm: 'text-sm text-slate-500 dark:text-slate-400',
  mutedSmMt2: 'text-sm text-slate-500 dark:text-slate-400 mt-2',
  mutedXs: 'text-xs text-slate-500 dark:text-slate-400',
  mutedXsTruncate: 'text-xs text-slate-500 dark:text-slate-400 truncate',
  mutedXsRelaxed: 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed',
  mutedXsRelaxedFaded: 'text-xs leading-relaxed opacity-90',
  inlineHeadingSm: 'flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200',
  truncateLabelXs: 'truncate text-xs font-medium text-slate-700 dark:text-slate-300',
  emptyStateMuted: 'p-8 text-center text-slate-500 dark:text-slate-400',
} as const;

export const media = {
  fullContain: 'w-full h-full object-contain',
} as const;

export const state = {
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  enterSlideRight500: 'animate-in fade-in slide-in-from-right-8 duration-500',
  enterZoomIn95: 'animate-in fade-in zoom-in-95',
  disabled: 'disabled:cursor-not-allowed disabled:opacity-60',
} as const;
