import { Package } from 'lucide-react';
import { placeholderPatternStyle } from '../helpers';

interface PackageCardThumbnailSectionProps {
  thumbnail: string;
  itemName: string;
  category: string;
}

export default function PackageCardThumbnailSection({
  thumbnail,
  itemName,
  category,
}: PackageCardThumbnailSectionProps) {
  return (
    <div
      className={`relative shrink-0 aspect-square h-full ${thumbnail ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'} after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-slate-100 after:content-[''] dark:after:bg-slate-800`}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={itemName} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-transparent">
            <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1]" style={placeholderPatternStyle}></div>

            <div className="relative">
              <div className="absolute -inset-4 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/40 dark:border-slate-700/50 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <Package size={32} className="text-slate-300 dark:text-slate-500" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 z-10">
        <span className="px-2 py-1 rounded-md bg-white/90 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-600 dark:text-slate-300 font-bold shadow-sm">
          {category}
        </span>
      </div>
    </div>
  );
}
