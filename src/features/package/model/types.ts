import type { PackageItem } from '@/utils/catalogStore';
import type { License } from '@/utils/catalogSchema';

export interface CarouselImage {
  src: string;
  alt: string;
}

export type PackageLicenseEntry = License & { key: string; body: string };

export interface PackageMarkdownState {
  html: string;
  loading: boolean;
  error: string;
}

export type PackageRelationKey = 'requires' | 'recommends' | 'conflicts' | 'similar' | 'replaces' | 'forkOf';

export interface PackageRelationSection {
  key: PackageRelationKey;
  items: PackageItem[];
  missingIds: string[];
}
