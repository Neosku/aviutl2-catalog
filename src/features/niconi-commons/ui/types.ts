import type { CopyState, EligibleItem, SelectedMap } from '../model/types';

export interface HeaderSectionProps {
  copyState: CopyState;
  selectedCount: number;
  onCopySelected: () => void;
}

export interface GuideSectionProps {
  onOpenGuide: () => void;
}

export interface ToolbarSectionProps {
  visibleCount: number;
  selectedCount: number;
  query: string;
  onQueryChange: (next: string) => void;
}

export interface TableSectionProps {
  visibleCount: number;
  totalEligible: number;
  filteredItems: EligibleItem[];
  allVisibleSelected: boolean;
  selectedMap: SelectedMap;
  onToggleAllVisible: () => void;
  onToggleItem: (id: string) => void;
}
