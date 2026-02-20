import PackageCard from '../../../../components/package-card/PackageCard';
import type { PackageGridSectionProps } from '../types';

export default function PackageGridSection({ filteredPackages, listSearch }: PackageGridSectionProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(500px,1fr))] gap-6 pb-10">
      {filteredPackages.map((item) => (
        <PackageCard key={item.id} item={item} listSearch={listSearch} />
      ))}
    </div>
  );
}
