import { Link } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NotFoundPage() {
  return (
    <AppShell
      title='Halaman tidak ditemukan'
      subtitle='URL yang Anda akses tidak tersedia'
      mainClassName='flex items-center justify-center'
    >
      <div className='text-center'>
        <p className='text-sm text-slate-500'>
          Periksa kembali alamat URL atau kembali ke halaman utama.
        </p>
        <Link to='/' className={cn(buttonVariants(), 'mt-6 inline-flex')}>
          Kembali ke beranda
        </Link>
      </div>
    </AppShell>
  );
}
