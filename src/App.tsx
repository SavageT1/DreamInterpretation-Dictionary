import DreamJournal from './components/DreamJournal';
import ConsentBanner from './components/ConsentBanner';
import LegalPage from './components/LegalPage';
import EducationPage from './components/EducationPage';
import NotFoundPage from './components/NotFoundPage';

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const legalPaths = ['/privacy', '/terms', '/about', '/contact', '/editorial-policy'];
  const educationPaths = ['/blog', '/dream-terms'];
  const isHome = path === '/';

  return (
    <div className="min-h-screen bg-[#050505]">
      {isHome ? <DreamJournal /> : legalPaths.includes(path) ? <LegalPage path={path} /> : educationPaths.includes(path) ? <EducationPage kind={path === '/blog' ? 'blog' : 'dictionary'} /> : <NotFoundPage />}
      <ConsentBanner />
    </div>
  );
}
