import { Link } from 'react-router-dom';
import type { BrandMenuItem } from '@/config/brands';
import { cn } from '@/lib/utils';

type MenuCardProps = {
  item: BrandMenuItem;
  className?: string;
};

export function MenuCard({ item, className }: MenuCardProps) {
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <div
        className={cn(
          'flex flex-col rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 opacity-70',
          className
        )}
      >
        <div className='flex size-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500'>
          <Icon className='size-5' />
        </div>
        <h3 className='mt-4 text-sm font-semibold text-slate-700'>
          {item.title}
        </h3>
        <p className='mt-2 flex-1 text-xs leading-relaxed text-slate-500'>
          {item.description}
        </p>
        <span className='mt-4 text-xs font-medium text-slate-400'>Segera hadir</span>
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      className={cn(
        'group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md',
        className
      )}
    >
      <div className='flex size-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm transition-transform group-hover:scale-105'>
        <Icon className='size-5' />
      </div>
      <h3 className='mt-4 text-sm font-semibold text-slate-900'>
        {item.title}
      </h3>
      <p className='mt-2 flex-1 text-xs leading-relaxed text-slate-500'>
        {item.description}
      </p>
      <span className='mt-4 text-xs font-medium text-sky-600'>
        Buka tool →
      </span>
    </Link>
  );
}
