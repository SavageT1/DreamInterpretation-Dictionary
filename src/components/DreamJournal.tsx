import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import FEATURED_OFFER_IMAGE from '../../som-sleep-powder-drink-mix-all-flavors.jpeg';
import { trackEvent } from '../lib/analytics';

type VaultEntry = {
  id: string;
  title: string;
  dream: string;
  dreamBookNotes: string;
  interpretation: string;
  createdAt: string;
  starred: boolean;
};

const STORAGE_KEY = 'dream-interpretation-dictionary:vault:v1';
const FREE_ENTRY_LIMIT = 3;
const FREE_INTERPRETATION_LIMIT = 3;
const FEATURED_OFFER_URL = 'https://somsleep.sjv.io/5kqA5L';
const FEATURED_PROJECT_URL = 'https://upwork.pxf.io/enQqRz';
const FEATURED_TOOL_URL = 'https://muzzle.sjv.io/oNGznm';
const FEATURED_QUIET_URL = 'https://quiettimellc.sjv.io/0GnmmJ';
const FEATURED_HUB_URL = 'https://hubsparkinc.sjv.io/c/5677401/3764648/47578';
const FEATURED_SLEEP_URL = 'https://sleepcyclecreator.sjv.io/c/5677401/2545291/26752';
const FEATURED_NATURAL_URL = 'https://nuleafnaturals.sjv.io/c/5677401/659367/10322';
const FEATURED_REWARX_URL = 'https://rewarxlimited.pxf.io/VOQZNO';
const FEATURED_REWARX_STUDIO_URL = 'https://rewarxlimited.pxf.io/c/5677401/3953964/49656';
type PartnerLink = {
  href: string;
  label: string;
  title: string;
  description: string;
  buttonLabel: string;
  thumbnail: string;
  gradient: string;
  imageSrc?: string;
  imageAlt?: string;
  meta?: string;
};

const partnerLinks: PartnerLink[] = [
  {
    href: FEATURED_OFFER_URL,
    label: 'Sleep pick',
    title: 'Sleep support',
    description: 'A useful option for your dream and sleep routine.',
    buttonLabel: 'View',
    thumbnail: 'ZZ',
    gradient: 'from-fuchsia-500/90 via-purple-500/70 to-cyan-400/70',
    imageSrc: FEATURED_OFFER_IMAGE,
    imageAlt: 'Som Sleep product image',
    meta: 'Sleep routine',
  },
  {
    href: FEATURED_PROJECT_URL,
    label: 'Work pick',
    title: 'Project support',
    description: 'Helpful if you want outside help with writing, design, or site features.',
    buttonLabel: 'Open',
    thumbnail: 'UP',
    gradient: 'from-emerald-500/80 via-teal-500/70 to-sky-400/70',
    meta: 'Support work',
  },
  {
    href: FEATURED_TOOL_URL,
    label: 'Focus pick',
    title: 'Calmer browsing and focus',
    description: 'A useful companion if you want fewer interruptions while writing or journaling.',
    buttonLabel: 'Open',
    thumbnail: 'MF',
    gradient: 'from-indigo-500/80 via-violet-500/70 to-fuchsia-400/70',
    meta: 'Focus boost',
  },
  {
    href: FEATURED_QUIET_URL,
    label: 'Quiet pick',
    title: 'Evening reset',
    description: 'A simple option for a calmer night routine before sleep.',
    buttonLabel: 'View',
    thumbnail: 'QT',
    gradient: 'from-amber-500/80 via-orange-500/70 to-rose-400/70',
    meta: 'Night reset',
  },
  {
    href: FEATURED_HUB_URL,
    label: 'More picks',
    title: 'Helpful support',
    description: 'Another useful option if you want a simple extra resource.',
    buttonLabel: 'Open',
    thumbnail: 'HS',
    gradient: 'from-sky-500/80 via-blue-500/70 to-indigo-400/70',
    meta: 'Resource pick',
  },
  {
    href: FEATURED_SLEEP_URL,
    label: 'Sleep boost',
    title: 'Improve your sleep',
    description: 'A simple sleep-focused recommendation for the sidebar.',
    buttonLabel: 'View',
    thumbnail: 'SL',
    gradient: 'from-cyan-500/80 via-sky-500/70 to-blue-400/70',
    meta: 'Sleep support',
  },
  {
    href: FEATURED_NATURAL_URL,
    label: 'Wellness pick',
    title: 'Natural support',
    description: 'A wellness option to round out the recommendations area.',
    buttonLabel: 'View',
    thumbnail: 'NL',
    gradient: 'from-lime-500/80 via-emerald-500/70 to-green-400/70',
    meta: 'Wellness',
  },
  {
    href: FEATURED_REWARX_URL,
    label: 'New pick',
    title: 'Improve your sleep',
    description: 'A simple sleep-focused recommendation for the sidebar.',
    buttonLabel: 'View',
    thumbnail: 'RX',
    gradient: 'from-rose-500/80 via-pink-500/70 to-fuchsia-400/70',
    meta: 'New pick',
  },
  {
    href: FEATURED_REWARX_STUDIO_URL,
    label: 'Studio pick',
    title: 'AI Product Photography for Ecommerce',
    description:
      'Commercial-quality product visuals for stores, marketplaces, and social media.',
    buttonLabel: 'View',
    thumbnail: 'RW',
    gradient: 'from-slate-500/80 via-zinc-500/70 to-neutral-400/70',
    meta: 'Ecommerce asset',
  },
];

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pickTitle(dream: string) {
  const cleaned = dream.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Untitled dream';

  return cleaned.length > 42 ? `${cleaned.slice(0, 42).trimEnd()}...` : cleaned;
}

export default function DreamJournal() {
  const [dream, setDream] = useState('');
  const [dreamBookNotes, setDreamBookNotes] = useState('');
  const [title, setTitle] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [interpretedDream, setInterpretedDream] = useState('');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretationError, setInterpretationError] = useState('');
  const [freeInterpretationsLeft, setFreeInterpretationsLeft] = useState(FREE_INTERPRETATION_LIMIT);
  const [isPremium, setIsPremium] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const interpretTimer = useRef<number | null>(null);
  const pendingDream = useRef('');
  const hasTrackedDreamStart = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as VaultEntry[];
      if (Array.isArray(parsed)) {
        setVault(parsed);
      }
    } catch {
      setVault([]);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const verifyPurchase =
      params.get('checkout') === 'success' && sessionId
        ? fetch(`/api/verify-purchase?session_id=${encodeURIComponent(sessionId)}`)
        : fetch('/api/access');

    verifyPurchase
      .then(async (response) => {
        const data = (await response.json()) as {
          premium?: boolean;
          freeRemaining?: number | null;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || 'Unable to verify access.');
        setIsPremium(Boolean(data.premium));
        if (typeof data.freeRemaining === 'number') {
          setFreeInterpretationsLeft(data.freeRemaining);
        }
        if (sessionId) {
          trackEvent('premium_checkout_completed', { source: 'stripe_checkout' });
        }
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch(() => {
        if (sessionId) {
          setInterpretationError('Your payment is processing, but premium access could not be verified yet.');
        }
      });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
    } catch {
      // Ignore storage failures so the app still works offline.
    }
  }, [vault]);

  useEffect(() => {
    return () => {
      if (interpretTimer.current !== null) {
        window.clearTimeout(interpretTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isInterpreting && dream.trim() !== pendingDream.current) {
      if (interpretTimer.current !== null) {
        window.clearTimeout(interpretTimer.current);
        interpretTimer.current = null;
      }

      setIsInterpreting(false);
      setInterpretation('');
      setInterpretedDream('');
      pendingDream.current = '';
    }
  }, [dream, isInterpreting]);

  const freeSlotsLeft = Math.max(0, FREE_ENTRY_LIMIT - vault.length);
  const orderedVault = useMemo(
    () => [...vault].sort((a, b) => Number(b.starred) - Number(a.starred) || b.createdAt.localeCompare(a.createdAt)),
    [vault],
  );
  const liveTitle = title.trim() || (dream.trim() ? pickTitle(dream) : '');
  const hasDreamText = dream.trim().length > 0;
  const hasFreshReading = interpretedDream === dream.trim() && interpretation.trim().length > 0;
  const displayedInterpretation = isInterpreting ? '' : hasFreshReading ? interpretation : '';

  function handleDreamChange(nextDream: string) {
    setDream(nextDream);
    setInterpretationError('');

    if (!hasTrackedDreamStart.current && nextDream.trim()) {
      hasTrackedDreamStart.current = true;
      trackEvent('dream_started', { source: 'dream_form' });
    }
  }

  async function handleInterpret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanDream = dream.trim();
    if (!cleanDream) return;

    if (interpretTimer.current !== null) {
      window.clearTimeout(interpretTimer.current);
    }

    setIsInterpreting(true);
    setInterpretation('');
    setInterpretationError('');
    setSelectedId(null);
    pendingDream.current = cleanDream;
    trackEvent('dream_interpretation_started', { source: 'dream_form' });

    try {
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream: cleanDream, notes: dreamBookNotes.trim() }),
      });
      const result = (await response.json()) as {
        interpretation?: string;
        error?: string;
        premium?: boolean;
        freeRemaining?: number | null;
        upgradeRequired?: boolean;
      };

      if (!response.ok || !result.interpretation?.trim()) {
        if (result.upgradeRequired) setFreeInterpretationsLeft(0);
        throw new Error(result.error || 'The interpretation service did not return a reading.');
      }

      const nextInterpretation = result.interpretation.trim();
      setInterpretation(nextInterpretation);
      setInterpretedDream(cleanDream);
      setTitle((current) => current.trim() || pickTitle(cleanDream));
      setIsPremium(Boolean(result.premium));
      if (typeof result.freeRemaining === 'number') {
        setFreeInterpretationsLeft(result.freeRemaining);
      }
      trackEvent('dream_interpretation_completed', { source: 'dream_form' });
    } catch (error) {
      setInterpretationError(
        error instanceof Error ? error.message : 'The interpretation service is unavailable.',
      );
      trackEvent('dream_interpretation_error', { source: 'dream_form' });
    } finally {
      setIsInterpreting(false);
      pendingDream.current = '';
    }
  }

  function handleSave() {
    const cleanDream = dream.trim();
    if (!cleanDream) return;

    const hasFreshReading = interpretedDream === cleanDream && interpretation.trim().length > 0;
    if (!hasFreshReading) return;
    const nextInterpretation = interpretation;
    const nextEntry: VaultEntry = {
      id: createId(),
      title: title.trim() || pickTitle(cleanDream),
      dream: cleanDream,
      dreamBookNotes: dreamBookNotes.trim(),
      interpretation: nextInterpretation,
      createdAt: new Date().toISOString(),
      starred: false,
    };

    setInterpretation(nextInterpretation);
    setInterpretedDream(cleanDream);
    setVault((current) => [nextEntry, ...current]);
    setSelectedId(nextEntry.id);
    trackEvent('dream_saved', { vault_size: vault.length + 1 });
  }

  function handleLoad(entry: VaultEntry) {
    setDream(entry.dream);
    setDreamBookNotes(entry.dreamBookNotes);
    setTitle(entry.title);
    setInterpretation(entry.interpretation);
    setInterpretedDream(entry.dream);
    setSelectedId(entry.id);
  }

  function toggleStar(id: string) {
    setVault((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, starred: !entry.starred } : entry)),
    );
  }

  function removeEntry(id: string) {
    setVault((current) => current.filter((entry) => entry.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  async function openBillingRoute(route: '/api/checkout' | '/api/portal') {
    setIsStartingCheckout(true);
    setInterpretationError('');

    try {
      const response = await fetch(route, { method: 'POST' });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Secure billing could not be opened.');
      }
      if (route === '/api/checkout') {
        trackEvent('premium_checkout_started', { source: 'premium_card' });
      }
      window.location.assign(data.url);
    } catch (error) {
      setInterpretationError(
        error instanceof Error ? error.message : 'Secure billing could not be opened.',
      );
      setIsStartingCheckout(false);
    }
  }

  return (
    <main className="happy-site relative min-h-screen overflow-hidden bg-celestial-gradient text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="nebula-glow-1 absolute -left-24 top-[-8rem] h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="nebula-glow-2 absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="shooting-star-emitter" />
        <div className="shooting-star-emitter-2" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center justify-between gap-4" aria-label="Primary navigation">
          <a href="/" className="font-display text-sm font-bold uppercase tracking-[0.22em] text-slate-900">Dream Interpretation Dictionary</a>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-700"><a href="#how-it-works">How it works</a><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/contact">Contact</a></div>
        </nav>

        <header className="max-w-4xl py-4">
          <h1 className="font-display uppercase text-slate-950">
            <span className="block text-7xl font-black leading-[0.82] tracking-[-0.07em] sm:text-8xl lg:text-[9rem]">Dream</span>
            <span className="mt-4 block text-2xl font-bold tracking-[0.16em] text-teal-700 sm:text-4xl">Interpretation</span>
            <span className="mt-2 block text-sm font-bold tracking-[0.5em] text-violet-700 sm:text-base">Dictionary</span>
          </h1>
          <p className="mt-7 max-w-3xl text-lg font-semibold leading-tight text-slate-800 sm:text-2xl">
            Understand the <span className="mx-1 inline-block text-3xl font-black uppercase text-violet-400 sm:text-5xl">meaning</span>
            <span> of what you&apos;re </span>
            <span className="mx-1 inline-block text-3xl font-black uppercase text-teal-300 sm:text-5xl">dreaming</span>.
          </p>
          <p className="mt-4 text-lg font-semibold text-slate-700">Track it in your private dream journal.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <form
              onSubmit={handleInterpret}
              className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur"
              aria-busy={isInterpreting}
            >
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Describe the dream</span>
                <textarea
                  value={dream}
                  onChange={(event) => handleDreamChange(event.target.value)}
                  rows={8}
                  className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10"
                />
                <span className="text-xs text-slate-500">Include what happened, who was there, and how it felt.</span>
                <span className="text-xs text-slate-500">
                  Your dream text is sent securely to OpenAI for interpretation. Readings are reflective, not medical advice or predictions.
                </span>
              </label>

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={isInterpreting || !hasDreamText}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isInterpreting ? 'Interpreting...' : hasDreamText ? 'Interpret dream' : 'Enter a dream first'}
                </button>
                <span className="ml-3 text-xs text-slate-400">
                  {isPremium ? 'Premium: unlimited readings' : `${freeInterpretationsLeft} free interpretations left`}
                </span>
              </div>
            </form>

            <div className="grid gap-6 md:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5" aria-live="polite">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Live reading</p>
                <h2 className="mt-3 font-display text-2xl text-white">
                  {isInterpreting ? 'Reading your dream...' : liveTitle || 'Your reading will appear here'}
                </h2>
                {isInterpreting ? (
                  <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
                    <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300" />
                    <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-fuchsia-300 [animation-delay:150ms]" />
                    <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-white/80 [animation-delay:300ms]" />
                    <span>Reading in progress</span>
                  </div>
                ) : null}
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {isInterpreting
                    ? 'We are translating the symbols and emotional tone into a reading now...'
                    : displayedInterpretation || 'Describe your dream, then select Interpret dream for your full reading.'}
                </p>

                {interpretationError ? (
                  <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                    {interpretationError}
                  </p>
                ) : null}

                {hasFreshReading ? (
                  <section className="mt-6 border-t border-white/10 pt-5" aria-label="Save this reading">
                    <p className="text-sm font-semibold text-white">Want to save this reading?</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      These details are optional and only help you find this dream later.
                    </p>

                    <div className="mt-4 grid gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-200">Dream title (optional)</span>
                        <input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-200">Dream book notes (optional)</span>
                        <textarea
                          value={dreamBookNotes}
                          onChange={(event) => setDreamBookNotes(event.target.value)}
                          rows={3}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
                          placeholder="Add symbols, book references, or anything you want to remember."
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                      >
                        Save to dream vault
                      </button>
                    </div>
                  </section>
                ) : null}
              </article>

              <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-cyan-400/10 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Premium</p>
                <h2 className="mt-3 font-display text-2xl text-white">Unlimited interpretations</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
                  <li>- Start with {FREE_INTERPRETATION_LIMIT} personalized readings.</li>
                  <li>- Upgrade for unlimited AI interpretations at $7.99 per month.</li>
                  <li>- Manage or cancel securely through Stripe.</li>
                </ul>
                <button
                  type="button"
                  onClick={() => openBillingRoute(isPremium ? '/api/portal' : '/api/checkout')}
                  disabled={isStartingCheckout}
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {isStartingCheckout
                    ? 'Opening secure billing...'
                    : isPremium
                      ? 'Manage subscription'
                      : 'Unlock unlimited readings'}
                </button>
              </article>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Saved dreams</p>
                  <h2 className="mt-2 font-display text-2xl text-white">Your vault</h2>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                  {freeSlotsLeft} free saves remaining
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {orderedVault.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                    No vault entries yet. Save your first dream to begin tracking patterns.
                  </p>
                ) : (
                  orderedVault.map((entry) => (
                    <article
                      key={entry.id}
                      className={`rounded-2xl border px-4 py-4 transition ${
                        selectedId === entry.id
                          ? 'border-fuchsia-400/60 bg-fuchsia-500/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{entry.title}</h3>
                          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {entry.starred ? <span className="text-xs text-cyan-300">Starred</span> : null}
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">{entry.interpretation}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoad(entry)}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStar(entry.id)}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          {entry.starred ? 'Unstar' : 'Star'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="space-y-4">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Helpful picks</p>
              <div className="grid gap-4">
                <p className="text-sm leading-6 text-slate-400">Sponsored resources may earn us a commission at no extra cost to you.</p>
                {partnerLinks.slice(0, 3).map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    onClick={() =>
                      trackEvent('affiliate_click', {
                        partner: item.label,
                        offer: item.title,
                      })
                    }
                    className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/20"
                  >
                    <div className="relative isolate overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-90`} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_35%)]" />
                      <div className="relative space-y-4 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/90">
                            Sponsored
                          </span>
                          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
                            {item.meta ?? item.label}
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-[144px_1fr]">
                      <div className="relative h-36 overflow-hidden rounded-[1.35rem] border border-white/15 bg-black/20 shadow-[0_20px_40px_rgba(0,0,0,0.28)]">
                        {item.imageSrc ? (
                          <img
                            src={item.imageSrc}
                            alt={item.imageAlt ?? item.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] border border-white/15 bg-white/10 text-3xl font-black tracking-[0.2em] text-white shadow-[0_18px_34px_rgba(0,0,0,0.25)]">
                              <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">{item.thumbnail}</span>
                            </div>
                          </div>
                        )}
                        </div>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <div className="max-w-xl">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/75">{item.label}</p>
                            <h3 className="mt-2 font-display text-2xl text-white sm:text-[1.9rem]">{item.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-white/85 sm:text-[0.95rem]">
                              {item.description}
                            </p>
                          </div>

                          <div className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-black/10 transition group-hover:translate-x-0.5">
                            {item.buttonLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>

          </aside>
        </div>

        <section id="how-it-works" className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10"><p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Step one</p><h2 className="mt-3 font-display text-2xl font-bold text-slate-950">Describe what you remember</h2><p className="mt-3 leading-7 text-slate-700">Write the setting, people, actions, objects, and emotions that stood out. Personal context matters more than finding one universal definition.</p></article>
          <article className="rounded-3xl border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10"><p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Step two</p><h2 className="mt-3 font-display text-2xl font-bold text-slate-950">Explore possible meanings</h2><p className="mt-3 leading-7 text-slate-700">Your reading connects common symbolic themes with the emotional tone of your dream. It offers possibilities for reflection—not predictions or diagnoses.</p></article>
          <article className="rounded-3xl border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10"><p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Step three</p><h2 className="mt-3 font-display text-2xl font-bold text-slate-950">Save only if you want</h2><p className="mt-3 leading-7 text-slate-700">After the reading, add an optional title or note and keep it in your private on-device journal. No account is required for local saves.</p></article>
        </section>

        <section className="rounded-[2rem] border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-700">A better way to use a dream dictionary</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold text-slate-950">Symbols are starting points, not fixed answers.</h2>
          <div className="mt-5 grid gap-5 text-base leading-7 text-slate-700 md:grid-cols-2"><p>Water might feel peaceful to one person and threatening to another. A house could represent safety, identity, family history, or simply a recent memory. A useful interpretation considers what happened, how you felt, and what the symbol means in your own life.</p><p>Reviewing dreams over time can reveal repeated places, emotions, and choices. Your journal helps you compare those patterns without claiming that dreams predict the future. Treat every reading as an invitation to reflect and keep what genuinely fits.</p></div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-slate-900/10 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 Dream Interpretation Dictionary. For reflection and entertainment—not professional advice.</p><nav className="flex flex-wrap gap-4" aria-label="Footer navigation"><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/editorial-policy">Editorial policy</a><a href="/contact">Contact</a></nav></footer>
      </section>
    </main>
  );
}
