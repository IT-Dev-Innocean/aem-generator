import { useParams } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { MenuCard } from '@/components/MenuCard';
import { getBrand } from '@/config/brands';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function BrandMenuPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const brand = getBrand(brandId);

  if (!brand) {
    return <NotFoundPage />;
  }

  return (
    <AppShell
      title={`${brand.name} Tools`}
      subtitle='Pilih tool yang ingin digunakan'
      backTo='/'
      backLabel='Semua brand'
      mainClassName='flex items-start justify-center lg:overflow-y-auto'>
      <div className='w-full max-w-4xl'>
        <div className='mb-8 flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:gap-6'>
          <div className='flex h-20 w-full shrink-0 items-center justify-center sm:w-40'>
            <img
              src={brand.logoSrc}
              alt={brand.logoAlt}
              className='max-h-16 max-w-[160px] object-contain'
            />
          </div>
          <div className='mt-4 text-center sm:mt-0 sm:text-left'>
            <h2 className='text-lg font-semibold text-slate-900'>
              {brand.name} Indonesia
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              {brand.tagline}
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {brand.menus.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
