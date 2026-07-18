import DreamJournal from './components/DreamJournal';
import ConsentBanner from './components/ConsentBanner';
import LegalPage from './components/LegalPage';

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const legalPaths = ['/privacy', '/terms', '/about', '/contact', '/editorial-policy'];

  return (
    <div className="min-h-screen bg-[#050505]">
      {legalPaths.includes(path) ? <LegalPage path={path} /> : <DreamJournal />}
      <ConsentBanner />
    </div>
  );
}
