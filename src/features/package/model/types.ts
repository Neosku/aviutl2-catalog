import type { PackageItem } from '@/utils/catalogStore';

export interface CarouselImage {
  src: string;
  alt: string;
}

export type PackageLicenseEntry = {
  key: string;
  type: string;
  body: string;
  copyrights?: { years: string; holder: string }[];
  licenseBody?: string | null;
};

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
