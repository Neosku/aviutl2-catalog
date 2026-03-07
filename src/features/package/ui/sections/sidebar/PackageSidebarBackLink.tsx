import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/Button';
import { HOME_LIST_RESTORE_STATE } from '../../../../../layouts/app-shell/types';
import type { PackageSidebarSectionProps } from '../../types';
import { cn } from '@/lib/cn';

type PackageSidebarBackLinkProps = Pick<PackageSidebarSectionProps, 'listLink'>;

export default function PackageSidebarBackLink({ listLink }: PackageSidebarBackLinkProps) {
  return (
    <div className="contents lg:block lg:sticky lg:bottom-0 lg:z-10 lg:mt-auto lg:pt-4">
      <Link
        to={listLink}
        state={HOME_LIST_RESTORE_STATE}
        className={cn(buttonVariants({ variant: 'secondary', size: 'default', radius: 'xl' }), 'w-full justify-center')}
      >
        <ArrowLeft size={18} /> パッケージ一覧に戻る
      </Link>
    </div>
  );
}
