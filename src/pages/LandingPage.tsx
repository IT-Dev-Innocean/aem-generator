import { Wand2 } from 'lucide-react';
import { BrandCard } from '@/components/BrandCard';
import { AppShell } from '@/components/AppShell';
import { BRAND_LIST } from '@/config/brands';

export function LandingPage() {
  return (
    <AppShell
      title='AEM HTML Generator'
      subtitle='Platform tools untuk konten website Hyundai & KIA'
      icon={<Wand2 className='size-5' />}
      mainClassName='flex items-center justify-center'
    >
      <div className='w-full max-w-3xl'>
        <div className='mb-8 text-center'>
          <h2 className='text-xl font-semibold text-slate-900 sm:text-2xl'>
            Pilih Brand
          </h2>
          <p className='mt-2 text-sm text-slate-500'>
            Pilih Hyundai atau KIA untuk melihat daftar tools yang tersedia.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {BRAND_LIST.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
