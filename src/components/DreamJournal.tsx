import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

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
const FEATURED_OFFER_URL = 'https://somsleep.sjv.io/5kqA5L';
const FEATURED_PROJECT_URL = 'https://upwork.pxf.io/enQqRz';
const FEATURED_TOOL_URL = 'https://muzzle.sjv.io/oNGznm';
const FEATURED_QUIET_URL = 'https://quiettimellc.sjv.io/0GnmmJ';
const FEATURED_HUB_URL = 'https://hubsparkinc.sjv.io/c/5677401/3764648/47578';
const FEATURED_SLEEP_URL = 'https://sleepcyclecreator.sjv.io/c/5677401/2545291/26752';
const FEATURED_NATURAL_URL = 'https://nuleafnaturals.sjv.io/c/5677401/659367/10322';
const FEATURED_REWARX_URL = 'https://rewarxlimited.pxf.io/VOQZNO';
const FEATURED_REWARX_STUDIO_URL = 'https://rewarxlimited.pxf.io/c/5677401/3953964/49656';
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? '';
const FEATURED_OFFER_IMAGE = new URL('../../som-sleep-powder-drink-mix-all-flavors.jpeg', import.meta.url).href;

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
  },
  {
    href: FEATURED_PROJECT_URL,
    label: 'Work pick',
    title: 'Project support',
    description: 'Helpful if you want outside help with writing, design, or site features.',
    buttonLabel: 'Open',
    thumbnail: 'UP',
    gradient: 'from-emerald-500/80 via-teal-500/70 to-sky-400/70',
  },
  {
    href: FEATURED_TOOL_URL,
    label: 'Focus pick',
    title: 'Calmer browsing and focus',
    description: 'A useful companion if you want fewer interruptions while writing or journaling.',
    buttonLabel: 'Open',
    thumbnail: 'MF',
    gradient: 'from-indigo-500/80 via-violet-500/70 to-fuchsia-400/70',
  },
  {
    href: FEATURED_QUIET_URL,
    label: 'Quiet pick',
    title: 'Evening reset',
    description: 'A simple option for a calmer night routine before sleep.',
    buttonLabel: 'View',
    thumbnail: 'QT',
    gradient: 'from-amber-500/80 via-orange-500/70 to-rose-400/70',
  },
  {
    href: FEATURED_HUB_URL,
    label: 'More picks',
    title: 'Helpful support',
    description: 'Another useful option if you want a simple extra resource.',
    buttonLabel: 'Open',
    thumbnail: 'HS',
    gradient: 'from-sky-500/80 via-blue-500/70 to-indigo-400/70',
    imageSrc: 'https://a.impactradius-go.com/display-ad/47578-3764648',
    imageAlt: 'Helpful support product image',
  },
  {
    href: FEATURED_SLEEP_URL,
    label: 'Sleep boost',
    title: 'Improve your sleep',
    description: 'A simple sleep-focused recommendation for the sidebar.',
    buttonLabel: 'View',
    thumbnail: 'SL',
    gradient: 'from-cyan-500/80 via-sky-500/70 to-blue-400/70',
  },
  {
    href: FEATURED_NATURAL_URL,
    label: 'Wellness pick',
    title: 'Natural support',
    description: 'A wellness option to round out the recommendations area.',
    buttonLabel: 'View',
    thumbnail: 'NL',
    gradient: 'from-lime-500/80 via-emerald-500/70 to-green-400/70',
    imageSrc: 'https://a.impactradius-go.com/display-ad/10322-659367',
    imageAlt: 'Natural support product image',
  },
  {
    href: FEATURED_REWARX_URL,
    label: 'New pick',
    title: 'Improve your sleep',
    description: 'A simple sleep-focused recommendation for the sidebar.',
    buttonLabel: 'View',
    thumbnail: 'RX',
    gradient: 'from-rose-500/80 via-pink-500/70 to-fuchsia-400/70',
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
    imageSrc: 'https://a.impactradius-go.com/display-ad/49656-3953964',
    imageAlt: 'AI Product Photography for Ecommerce ad',
  },
];

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function summarizeDream(dream: string) {
  const text = dream.trim();
  if (!text) return 'Your dream will appear here after you interpret it.';

  const lower = text.toLowerCase();
  const signals: string[] = [];

  if (/(fall|falling|drop|dropped)/.test(lower)) {
    signals.push('You may be processing pressure, uncertainty, or a loss of control.');
  }

  if (/(water|ocean|river|rain|flood|swim)/.test(lower)) {
    signals.push('Water often points to emotion, intuition, or a situation that feels deep and active.');
  }

  if (/(teeth|tooth)/.test(lower)) {
    signals.push('Teeth dreams often connect to confidence, change, or concern about appearance and communication.');
  }

  if (/(chase|running|hiding|escape)/.test(lower)) {
    signals.push('This can reflect avoidance, urgency, or a part of life that needs attention.');
  }

  if (/(house|room|home|door)/.test(lower)) {
    signals.push('A house or room may symbolize your inner life, identity, or a specific area of your world.');
  }

  if (signals.length === 0) {
    signals.push('This dream looks like it is asking for context from your waking life and any recurring symbols.');
  }

  return [
    'Dream reading',
    ...signals,
    'If you want a sharper reading, add a dream book note and watch for repeated symbols over time.',
  ].join(' ');
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
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const interpretTimer = useRef<number | null>(null);
  const pendingDream = useRef('');

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

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined') {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`,
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);
    }

    const analyticsWindow = window as Window & { dataLayer?: unknown[][] };
    const dataLayer = analyticsWindow.dataLayer ?? [];
    analyticsWindow.dataLayer = dataLayer;

    function gtag(...args: unknown[]) {
      dataLayer.push(args);
    }

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { send_page_view: true });
  }, []);

  const freeSlotsLeft = Math.max(0, FREE_ENTRY_LIMIT - vault.length);
  const orderedVault = useMemo(
    () => [...vault].sort((a, b) => Number(b.starred) - Number(a.starred) || b.createdAt.localeCompare(a.createdAt)),
    [vault],
  );
  const liveTitle = title.trim() || (dream.trim() ? pickTitle(dream) : '');
  const liveInterpretation = dream.trim() ? summarizeDream(dream) : '';
  const hasDreamText = dream.trim().length > 0;
  const hasFreshReading = interpretedDream === dream.trim() && interpretation.trim().length > 0;
  const displayedInterpretation = isInterpreting ? '' : hasFreshReading ? interpretation : liveInterpretation;

  function handleInterpret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanDream = dream.trim();
    if (!cleanDream) return;

    if (interpretTimer.current !== null) {
      window.clearTimeout(interpretTimer.current);
    }

    setIsInterpreting(true);
    setInterpretation('');
    setSelectedId(null);
    pendingDream.current = cleanDream;

    interpretTimer.current = window.setTimeout(() => {
      const nextInterpretation = summarizeDream(cleanDream);
      setInterpretation(nextInterpretation);
      setInterpretedDream(cleanDream);
      setTitle((current) => current.trim() || pickTitle(cleanDream));
      setIsInterpreting(false);
      interpretTimer.current = null;
      pendingDream.current = '';
    }, 500);
  }

  function handleSave() {
    const cleanDream = dream.trim();
    if (!cleanDream) return;

    const hasFreshReading = interpretedDream === cleanDream && interpretation.trim().length > 0;
    const nextInterpretation = hasFreshReading ? interpretation : summarizeDream(cleanDream);
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-celestial-gradient text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="nebula-glow-1 absolute -left-24 top-[-8rem] h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="nebula-glow-2 absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="shooting-star-emitter" />
        <div className="shooting-star-emitter-2" />
      </div>

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.32em] text-slate-300">
            Dream Interpretation Dictionary
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Track dreams, interpret symbols, and build your vault.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Track your dreams, get a live reading as you type, and save the ones you want to revisit later.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <form
              onSubmit={handleInterpret}
              className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur"
              aria-busy={isInterpreting}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Dream title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10"
                  />
                  <span className="text-xs text-slate-500">Give the dream a short name so you can find it later.</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Dream book notes</span>
                  <input
                    value={dreamBookNotes}
                    onChange={(event) => setDreamBookNotes(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
                  />
                  <span className="text-xs text-slate-500">Capture symbols, book references, or a quick insight.</span>
                </label>
              </div>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Describe the dream</span>
                <textarea
                  value={dream}
                  onChange={(event) => setDream(event.target.value)}
                  rows={8}
                  className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10"
                />
                <span className="text-xs text-slate-500">Include what happened, who was there, and how it felt.</span>
              </label>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isInterpreting || !hasDreamText}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isInterpreting ? 'Interpreting...' : hasDreamText ? 'Interpret dream' : 'Enter a dream first'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isInterpreting || !hasDreamText}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save to dream vault
                </button>
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
                    : displayedInterpretation || 'Type a dream and this reading updates instantly.'}
                </p>
              </article>

              <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-cyan-400/10 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Vault</p>
                <h2 className="mt-3 font-display text-2xl text-white">Dream Vault</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
                  <li>- Free tier includes {FREE_ENTRY_LIMIT} saved dreams to get started.</li>
                  <li>- Save recurring symbols, notes, and interpretations in one place.</li>
                  <li>- Review old dreams and notice patterns over time.</li>
                </ul>
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
                {partnerLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20"
                  >
                    <div className="grid gap-4 p-4 sm:grid-cols-[112px_1fr]">
                      <div
                        className={`relative h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} shadow-inner`}
                      >
                        {item.imageSrc ? (
                          <img
                            src={item.imageSrc}
                            alt={item.imageAlt ?? item.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl font-black tracking-[0.2em] text-white">
                            <span className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">{item.thumbnail}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                          <h3 className="mt-2 font-display text-2xl text-white">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                        </div>
                        <div className="mt-4 inline-flex items-center justify-center self-start rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-white/10">
                          {item.buttonLabel}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>

          </aside>
        </div>
      </section>
    </main>
  );
}
