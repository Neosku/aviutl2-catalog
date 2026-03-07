import { useMemo } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import { layout, surface, text } from '@/components/ui/_styles';
import { cn } from '@/lib/cn';
import type { PackageHeaderSectionProps } from '../types';

export default function PackageHeaderSection({ item, listLink, heroImage }: PackageHeaderSectionProps) {
  const heroImageStyle = useMemo(() => ({ backgroundImage: `url(${heroImage})` }), [heroImage]);

  return (
    <>
      <nav className={cn(text.mutedSm, 'flex items-center')}>
        <Link to={listLink} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
          パッケージ一覧
        </Link>
        <ChevronRight size={16} className="mx-2" />
        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{item.name}</span>
      </nav>

      <section className={cn(surface.cardOverflow, 'relative', heroImage ? 'min-h-[160px]' : '')}>
        {heroImage ? (
          <div className="absolute inset-0 bg-cover bg-center opacity-25" style={heroImageStyle} aria-hidden />
        ) : null}
        <div className="relative p-6 space-y-3">
          <div className={layout.rowBetweenWrapStartGap4}>
            <div className="space-y-2">
              <Badge variant="primary" shape="pill" size="sm" className="gap-2 normal-case">
                {item.type || '未分類'}
              </Badge>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.name}</h1>
            </div>
            {item.installed ? (
              <Badge variant="success" shape="pill" size="sm" className={cn(layout.inlineGap1, 'font-bold')}>
                <CheckCircle2 size={14} /> 導入済
              </Badge>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
