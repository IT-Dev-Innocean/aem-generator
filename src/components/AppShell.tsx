import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type AppShellProps = {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  mainClassName?: string;
};

export function AppShell({
  title,
  subtitle,
  backTo,
  backLabel = 'Kembali',
  icon,
  children,
  className,
  mainClassName,
}: AppShellProps) {
  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-slate-100 lg:h-dvh lg:overflow-hidden',
        className
      )}
    >
      <header className='shrink-0 border-b border-slate-200 bg-white'>
        <div className='mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6 sm:py-4'>
          <div className='flex min-w-0 items-start gap-3 sm:items-center'>
            {backTo ? (
              <Link
                to={backTo}
                className='mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:mt-0'
              >
                <ArrowLeft className='size-4' />
                {backLabel}
              </Link>
            ) : null}
            {icon ? (
              <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm'>
                {icon}
              </div>
            ) : null}
            <div className='min-w-0'>
              <h1 className='text-base font-bold leading-tight text-slate-900 sm:text-lg'>
                {title}
              </h1>
              {subtitle ? (
                <p className='mt-0.5 text-xs leading-relaxed text-slate-500'>
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-[1400px] flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:min-h-0',
          mainClassName
        )}
      >
        {children}
      </main>
    </div>
  );
}
