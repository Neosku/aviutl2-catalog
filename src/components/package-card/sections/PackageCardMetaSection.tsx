import { memo, useMemo, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, TriangleAlert, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Badge from '@/components/ui/Badge';
import type { PackageCardItem } from '../types';
import { cn } from '@/lib/cn';
import { text } from '@/components/ui/_styles';

interface PackageCardMetaSectionProps {
  item: PackageCardItem;
  lastUpdated: string;
  tags: string[];
}

function handlePopoverTriggerClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

interface PortalTooltipProps {
  text: string;
  rect: DOMRect | null;
}

function PortalTooltip({ text: tooltipText, rect }: PortalTooltipProps) {
  const { t } = useTranslation('package');
  const top = rect ? rect.bottom + 8 : 0;
  const left = rect ? rect.left : 0;
  const tooltipStyle = useMemo(
    () => ({
      top: `${top}px`,
      left: `${left}px`,
    }),
    [top, left],
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

function PackageCardMetaSection({ item, lastUpdated, tags }: PackageCardMetaSectionProps) {
  const { t } = useTranslation('package');
  const deprecationButtonRef = useRef<HTMLButtonElement | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const deprecatedNameClass = item.deprecation
    ? 'text-yellow-600 dark:text-yellow-300 group-hover:text-yellow-500 dark:group-hover:text-yellow-200'
    : '';

  return (
    <>
      <div className="mb-1">
        <h3
          className={cn(
            'min-w-0 truncate pr-2 font-bold text-xl tracking-tight text-slate-800 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400',
            deprecatedNameClass,
          )}
          title={item.name}
        >
          {item.name}
        </h3>
        {item.deprecation ? (
          <div className="mt-1 mb-1">
            <span className="relative inline-flex pointer-events-auto align-middle">
              <button
                ref={deprecationButtonRef}
                type="button"
                aria-label={t('meta.deprecatedAria')}
                className="inline-flex items-center gap-1 rounded-full border border-yellow-200 bg-yellow-50 px-2 py-1 text-[11px] font-bold leading-none text-yellow-600 transition-colors hover:border-yellow-300 hover:bg-yellow-100 hover:text-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 dark:border-yellow-800/60 dark:bg-yellow-950/30 dark:text-yellow-300 dark:hover:border-yellow-700 dark:hover:bg-yellow-950/45 dark:hover:text-yellow-200"
                onClick={(event) => {
                  handlePopoverTriggerClick(event);
                  setHoverRect(deprecationButtonRef.current?.getBoundingClientRect() ?? null);
                }}
                onMouseEnter={() => setHoverRect(deprecationButtonRef.current?.getBoundingClientRect() ?? null)}
                onMouseLeave={() => setHoverRect(null)}
                onFocus={() => setHoverRect(deprecationButtonRef.current?.getBoundingClientRect() ?? null)}
                onBlur={() => setHoverRect(null)}
              >
                <TriangleAlert size={12} />
                <span>{t('content.deprecated')}</span>
              </button>
              <PortalTooltip text={item.deprecation.message} rect={hoverRect} />
            </span>
          </div>
        ) : null}

        <div className={cn(text.mutedSm, 'flex items-center gap-3 mt-0.5 mb-1 font-medium')}>
          <div className="flex items-center gap-1 min-w-0">
            <User size={14} className="text-slate-400" />
            <span className="truncate">{item.author || '?'}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Calendar size={14} className="text-slate-400" />
            <span>{lastUpdated}</span>
          </div>
        </div>
      </div>

      <p className="text-[15px] text-slate-500 dark:text-slate-400/90 line-clamp-3 leading-normal mb-auto">
        {item.summary || ''}
      </p>

      <div className="flex flex-wrap gap-1 mt-1.5 mb-1">
        {tags.slice(0, 3).map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="neutral"
            shape="rounded"
            size="xxs"
            className="px-1.5 py-0.5 text-[10px] font-medium"
          >
            {tag}
          </Badge>
        ))}
        {tags.length > 3 ? (
          <Badge
            variant="neutral"
            shape="rounded"
            size="xxs"
            className="px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500"
          >
            +{tags.length - 3}
          </Badge>
        ) : null}
      </div>
    </>
  );
}

export default memo(PackageCardMetaSection);
