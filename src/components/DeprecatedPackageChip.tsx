import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DeprecatedPackageChipProps {
  message?: string;
}

function DeprecatedPackageTooltip({ text: tooltipText, rect }: { text: string; rect: DOMRect | null }) {
  const { t } = useTranslation('package');
  const tooltipStyle = useMemo(
    () => ({
      top: `${rect ? rect.bottom + 8 : 0}px`,
      left: `${rect ? rect.left : 0}px`,
    }),
    [rect],
  );

  if (!rect) return null;

  return createPortal(
    <div
      role="tooltip"
      className="fixed z-[9999] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-relaxed text-slate-700 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      style={tooltipStyle}
    >
      {tooltipText ? (
        <>
          <strong className="text-yellow-600 dark:text-yellow-300">{t('meta.deprecatedPrefix')}</strong>
          {tooltipText}
        </>
      ) : (
        <strong className="text-yellow-600 dark:text-yellow-300">{t('content.deprecated')}</strong>
      )}
    </div>,
    document.body,
  );
}

export default function DeprecatedPackageChip({ message = '' }: DeprecatedPackageChipProps) {
  const { t } = useTranslation('package');
  const chipRef = useRef<HTMLButtonElement | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  return (
    <span className="relative inline-flex pointer-events-auto align-middle">
      <button
        ref={chipRef}
        type="button"
        aria-label={t('meta.deprecatedAria')}
        className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2 py-1 text-[11px] font-bold leading-none text-yellow-600 transition-colors hover:border-yellow-300 hover:bg-yellow-100 hover:text-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 dark:border-yellow-800/60 dark:bg-yellow-950/30 dark:text-yellow-300 dark:hover:border-yellow-700 dark:hover:bg-yellow-950/45 dark:hover:text-yellow-200"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setHoverRect(chipRef.current?.getBoundingClientRect() ?? null);
        }}
        onMouseEnter={() => setHoverRect(chipRef.current?.getBoundingClientRect() ?? null)}
        onMouseLeave={() => setHoverRect(null)}
        onFocus={() => setHoverRect(chipRef.current?.getBoundingClientRect() ?? null)}
        onBlur={() => setHoverRect(null)}
      >
        <TriangleAlert size={12} />
        <span>{t('content.deprecated')}</span>
      </button>
      <DeprecatedPackageTooltip text={message} rect={hoverRect} />
    </span>
  );
}
