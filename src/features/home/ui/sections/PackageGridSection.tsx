import type { ComponentType } from 'react';
import PackageCardComponent from '../../../../components/PackageCard.jsx';
import type { PackageGridSectionProps } from '../types';

const PackageCard = PackageCardComponent as ComponentType<{
  item: PackageGridSectionProps['filteredPackages'][number];
  listSearch: string;
}>;

export default function PackageGridSection({ filteredPackages, listSearch }: PackageGridSectionProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(500px,1fr))] gap-6 pb-10">
      {filteredPackages.map((item) => (
        <PackageCard key={item.id} item={item} listSearch={listSearch} />
      ))}
    </div>
  );
}
