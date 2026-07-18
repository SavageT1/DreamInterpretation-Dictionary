import { useEffect, useState } from 'react';
import { updateConsent } from '../lib/analytics';

const CONSENT_KEY = 'dream-site-consent-v1';

export default function ConsentBanner() {
  const [choice, setChoice] = useState<string | null>(() => localStorage.getItem(CONSENT_KEY));

  useEffect(() => {
    if (choice === 'accepted') updateConsent(true);
    if (choice === 'rejected') updateConsent(false);
  }, [choice]);

  if (choice) return null;

  function choose(nextChoice: 'accepted' | 'rejected') {
    localStorage.setItem(CONSENT_KEY, nextChoice);
    setChoice(nextChoice);
  }

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-3xl border border-white/15 bg-slate-950/95 p-5 text-slate-100 shadow-2xl shadow-black/60 backdrop-blur" role="dialog" aria-label="Privacy choices">
      <h2 className="font-display text-lg font-semibold text-white">Your privacy choices</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        We use Google Analytics and, when approved, Google advertising to measure visits and support this free site. You can accept or reject optional analytics and advertising storage. Read our <a className="text-cyan-300 underline" href="/privacy">Privacy Policy</a>.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => choose('rejected')} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Reject optional cookies</button>
        <button type="button" onClick={() => choose('accepted')} className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950">Accept</button>
      </div>
    </aside>
  );
}
