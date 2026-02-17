import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PackageSidebarSectionProps } from '../../types';

type PackageSidebarBackLinkProps = Pick<PackageSidebarSectionProps, 'listLink'>;

export default function PackageSidebarBackLink({ listLink }: PackageSidebarBackLinkProps) {
  return (
    <div className="contents lg:block lg:sticky lg:bottom-0 lg:z-10 lg:mt-auto lg:pt-4">
      <Link to={listLink} className="btn btn--secondary w-full justify-center flex items-center gap-2">
        <ArrowLeft size={18} /> パッケージ一覧に戻る
      </Link>
    </div>
  );
}
