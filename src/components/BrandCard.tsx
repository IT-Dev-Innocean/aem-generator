import { Link } from 'react-router-dom';
import type { BrandConfig } from '@/config/brands';
import { cn } from '@/lib/utils';

type BrandCardProps = {
  brand: BrandConfig;
  className?: string;
};

export function BrandCard({ brand, className }: BrandCardProps) {
  return (
    <Link
      to={`/${brand.id}`}
      className={cn(
        'group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md',
        className
      )}
    >
      <div className='flex h-24 w-full items-center justify-center'>
        <img
          src={brand.logoSrc}
          alt={brand.logoAlt}
          className='max-h-20 max-w-[180px] object-contain transition-transform group-hover:scale-105'
        />
      </div>
      <h2 className='mt-6 text-lg font-semibold text-slate-900'>
        {brand.name}
      </h2>
      <p className='mt-2 text-center text-sm text-slate-500'>
        {brand.tagline}
      </p>
      <span className='mt-6 text-xs font-medium text-sky-600'>
        Pilih tools →
      </span>
    </Link>
  );
}
