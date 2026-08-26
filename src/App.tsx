import DreamJournal from './components/DreamJournal';
import ConsentBanner from './components/ConsentBanner';
import LegalPage from './components/LegalPage';
import EducationPage from './components/EducationPage';

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const legalPaths = ['/privacy', '/terms', '/about', '/contact', '/editorial-policy'];
  const educationPaths = ['/blog', '/dream-terms'];

  return (
    <div className="min-h-screen bg-[#050505]">
      {legalPaths.includes(path) ? <LegalPage path={path} /> : educationPaths.includes(path) ? <EducationPage kind={path === '/blog' ? 'blog' : 'dictionary'} /> : <DreamJournal />}
      <ConsentBanner />
    </div>
  );
}
