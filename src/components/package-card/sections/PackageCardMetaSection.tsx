import { Calendar, User } from 'lucide-react';
import type { PackageItem } from '../../../features/package/model/types';

interface PackageCardMetaSectionProps {
  item: PackageItem;
  lastUpdated: string;
  tags: string[];
}

export default function PackageCardMetaSection({ item, lastUpdated, tags }: PackageCardMetaSectionProps) {
  return (
    <>
      <div className="mb-1">
        <h3
          className="font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate pr-2 tracking-tight"
          title={item.name}
        >
          {item.name}
        </h3>

        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5 mb-1 font-medium">
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
        {item.summary || item.description || ''}
      </p>

      <div className="flex flex-wrap gap-1 mt-1.5 mb-1">
        {tags.slice(0, 3).map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700"
          >
            {tag}
          </span>
        ))}
        {tags.length > 3 ? (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-medium border border-slate-200 dark:border-slate-700">
            +{tags.length - 3}
          </span>
        ) : null}
      </div>
    </>
  );
}
