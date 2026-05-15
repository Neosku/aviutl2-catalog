import { memo } from 'react';
import { Calendar, User } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import DeprecatedPackageChip from '@/components/DeprecatedPackageChip';
import type { PackageCardItem } from '../types';
import { cn } from '@/lib/cn';
import { text } from '@/components/ui/_styles';

interface PackageCardMetaSectionProps {
  item: PackageCardItem;
  lastUpdated: string;
  tags: string[];
}

function PackageCardMetaSection({ item, lastUpdated, tags }: PackageCardMetaSectionProps) {
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
            <DeprecatedPackageChip message={item.deprecation.message} />
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
