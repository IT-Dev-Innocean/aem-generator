import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BrandMenuPage } from '@/pages/BrandMenuPage';
import { LandingPage } from '@/pages/LandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ArticleGeneratorPage } from '@/pages/kia/ArticleGeneratorPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/kia/article-generator' element={<ArticleGeneratorPage />} />
        <Route path='/hyundai/article-generator' element={<Navigate to='/hyundai' replace />} />
        <Route path='/:brandId' element={<BrandMenuPage />} />
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
