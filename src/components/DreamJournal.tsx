import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Sparkles, Star, Trash2, X } from 'lucide-react';

type VaultEntry = {
  id: string;
  title: string;
  dream: string;
  dreamBookNotes: string;
  interpretation: string;
  createdAt: string;
  starred: boolean;
};

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

const STORAGE_KEY = 'dream-interpretation-dictionary:vault:v1';
const FREE_ENTRY_LIMIT = 3;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() ?? '';

const FEATURED_OFFER_URL = 'https://somsleep.sjv.io/5kqA5L';
const FEATURED_PROJECT_URL = 'https://upwork.pxf.io/enQqRz';
const FEATURED_TOOL_URL = 'https://muzzle.sjv.io/oNGznm';
const FEATURED_QUIET_URL = 'https://quiettimellc.sjv.io/0GnmmJ';
const FEATURED_HUB_URL = 'https://hubsparkinc.sjv.io/AgAmm7';
const FEATURED_SLEEP_URL = 'https://sleepcyclecreator.sjv.io/c/5677401/2545291/26752';
const FEATURED_NATURAL_URL = 'https://nuleafnaturals.sjv.io/c/5677401/659367/10322';
const FEATURED_REWARX_URL = 'https://rewarxlimited.pxf.io/VOQZNO';
const FEATURED_REWARX_STUDIO_URL = 'https://rewarxlimited.pxf.io/c/5677401/3953964/49656';

const FEATURED_OFFER_IMAGE = 'https://a.impactradius-go.com/display-ad/34906-2982649';
const FEATURED_HUB_IMAGE = 'https://a.impactradius-go.com/display-ad/47578-3764648';
const FEATURED_NATURAL_IMAGE = 'https://a.impactradius-go.com/display-ad/10322-659367';

const partnerLinks: PartnerLink[] = [
  {
    href: FEATURED_OFFER_URL,
    label: 'Sleep pick',
    title: 'Sleep support',
    description: 'A simple sleep-support recommendation for the sidebar.',
    buttonLabel: 'View',
    thumbnail: 'ZZ',
    gradient: 'from-fuchsia-500/90 via-purple-500/70 to-cyan-400/70',
    imageSrc: FEATURED_OFFER_IMAGE,
    imageAlt: 'Sleep support ad image',
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
    title: 'Calmer browsing',
    description: 'A useful companion if you want fewer interruptions while journaling.',
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
    imageSrc: FEATURED_HUB_IMAGE,
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
    imageSrc: FEATURED_NATURAL_IMAGE,
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
    title: 'AI Product Photography',
    description: 'Commercial-quality product visuals for stores and marketplaces.',
    buttonLabel: 'View',
    thumbnail: 'RW',
    gradient: 'from-slate-500/80 via-zinc-500/70 to-neutral-400/70',
  },
];

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function summarizeDream(dreamText: string, notes: string, focus: string, tone: string) {
  const lower = dreamText.toLowerCase();
  const noteLower = notes.toLowerCase();
  const clues: string[] = [];
  const noteSignals: string[] = [];

  if (/(fall|falling|drop|dropped)/.test(lower)) clues.push('pressure, uncertainty, or a fear of losing your footing');
  if (/(water|ocean|river|rain|flood|swim)/.test(lower)) clues.push('emotions that are deep, active, or changing');
  if (/(teeth|tooth)/.test(lower)) clues.push('confidence, change, or concern about how you are being seen');
  if (/(chase|running|hiding|escape)/.test(lower)) clues.push('urgency, avoidance, or something that wants your attention');
  if (/(house|room|home|door)/.test(lower)) clues.push('your inner life, identity, or a specific area of life');
  if (/(snake|snakes|animal)/.test(lower)) clues.push('instincts, alertness, or a situation that feels unpredictable');
  if (/(car|drive|driving|road|traffic)/.test(lower)) clues.push('direction, momentum, or control over your path');
  if (/(school|class|test|exam|teacher)/.test(lower)) clues.push('learning, evaluation, or a situation where you feel tested');
  if (/(baby|child|pregnant)/.test(lower)) clues.push('something new that needs care, patience, or protection');
  if (/(death|dying|funeral)/.test(lower)) clues.push('an ending, transition, or major change');

  if (/(recurr|repeat|again|same)/.test(noteLower)) noteSignals.push('your notes suggest a recurring pattern worth tracking');
  if (/(nightmare|scary|fear|anxious)/.test(noteLower)) noteSignals.push('the emotional tone points toward stress that wants attention');
  if (/(lucid|aware|control)/.test(noteLower)) noteSignals.push('your awareness in the dream may be part of the message');
  if (/(book|symbol|dictionary|meaning)/.test(noteLower)) noteSignals.push('your notes point toward symbols you want to compare later');

  const intro = `${tone} reading for ${focus.toLowerCase()}.`;
  const clueSentence = clues.length
    ? `The strongest symbols point to ${clues.join(', ')}.`
    : 'The dream seems to ask for context from your waking life, especially the feeling it leaves behind.';
  const noteSentence = noteSignals.length
    ? `Your notes add: ${noteSignals.join(', ')}.`
    : 'Keeping notes on how the dream felt will make the next reading sharper.';

  return [intro, clueSentence, noteSentence].join(' ');
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
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dreamFocus, setDreamFocus] = useState('General');
  const [dreamTone, setDreamTone] = useState('Comforting');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInterpreting, setIsInterpreting] = useState(false);

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

    const analyticsWindow = window as Window & { dataLayer: unknown[][] };
    analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];

    function gtag(...args: unknown[]) {
      analyticsWindow.dataLayer.push(args);
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
  const liveInterpretation = dream.trim()
    ? summarizeDream(dream, dreamBookNotes, dreamFocus, dreamTone)
    : '';
  const displayedInterpretation = interpretation || liveInterpretation;
  const statusLabel = isInterpreting
    ? 'Reading your dream...'
    : dream.trim()
      ? 'Live reading ready'
      : 'Start typing for a reading';

  async function handleInterpret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanDream = dream.trim();
    if (!cleanDream || isInterpreting) return;

    setIsInterpreting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    const nextInterpretation = summarizeDream(cleanDream, dreamBookNotes, dreamFocus, dreamTone);
    setInterpretation(nextInterpretation);
    setTitle((current) => current.trim() || pickTitle(cleanDream));
    setSelectedId(null);
    setIsInterpreting(false);
  }

  function handleSave() {
    const cleanDream = dream.trim();
    if (!cleanDream) return;

    const nextInterpretation = interpretation.trim() || summarizeDream(cleanDream, dreamBookNotes, dreamFocus, dreamTone);
    const nextEntry: VaultEntry = {
      id: createId(),
      title: title.trim() || pickTitle(cleanDream),
      dream: cleanDream,
      dreamBookNotes: dreamBookNotes.trim(),
      interpretation: nextInterpretation,
      createdAt: new Date().toISOString(),
      starred: false,
    };

    setVault((current) => [nextEntry, ...current]);
    setSelectedId(nextEntry.id);
    setInterpretation(nextInterpretation);
  }

  function handleLoad(entry: VaultEntry) {
    setDream(entry.dream);
    setDreamBookNotes(entry.dreamBookNotes);
    setTitle(entry.title);
    setInterpretation(entry.interpretation);
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

  const visibleVault = orderedVault.filter((entry) => {
    const search = searchQuery.toLowerCase();
    return (
      entry.title.toLowerCase().includes(search) ||
      entry.dream.toLowerCase().includes(search) ||
      entry.interpretation.toLowerCase().includes(search)
    );
  });

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
            Write the dream, get an instant reading, save the ones worth revisiting, and keep the revenue paths visible without cluttering the page.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <form
              onSubmit={handleInterpret}
              className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Main journal</p>
                  <h2 className="mt-2 font-display text-2xl text-white">Write a dream and get a reading</h2>
                </div>
                <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-100">
                  {statusLabel}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Dream title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10"
                    placeholder="Optional title"
                  />
                  <span className="text-xs text-slate-500">Give the dream a short name so you can find it later.</span>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Dream book notes</span>
                  <input
                    value={dreamBookNotes}
                    onChange={(event) => setDreamBookNotes(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
                    placeholder="Symbols, book references, or a quick insight"
                  />
                  <span className="text-xs text-slate-500">Capture symbols, book references, or a quick insight.</span>
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Dream focus</span>
                  <select
                    value={dreamFocus}
                    onChange={(event) => setDreamFocus(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60 focus:bg-white/10"
                  >
                    <option className="bg-slate-900" value="General">General</option>
                    <option className="bg-slate-900" value="Love">Love</option>
                    <option className="bg-slate-900" value="Work">Work</option>
                    <option className="bg-slate-900" value="Family">Family</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-200">Reading tone</span>
                  <select
                    value={dreamTone}
                    onChange={(event) => setDreamTone(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/60 focus:bg-white/10"
                  >
                    <option className="bg-slate-900" value="Comforting">Comforting</option>
                    <option className="bg-slate-900" value="Analytical">Analytical</option>
                    <option className="bg-slate-900" value="Spiritual">Spiritual</option>
                    <option className="bg-slate-900" value="Direct">Direct</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-200">Describe the dream</span>
                <textarea
                  value={dream}
                  onChange={(event) => setDream(event.target.value)}
                  rows={8}
                  className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10"
                  placeholder="What happened, who was there, and how did it feel?"
                />
                <span className="text-xs text-slate-500">Include what happened, who was there, and how it felt.</span>
              </label>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                {isInterpreting ? (
                  <span className="inline-flex items-center gap-2 text-fuchsia-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reading your dream right now.
                  </span>
                ) : dream.trim() ? (
                  'Your reading updates instantly as you type, then gets saved when you choose to keep it.'
                ) : (
                  'Type a dream and this area will populate right away.'
                )}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={!dream.trim() || isInterpreting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isInterpreting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isInterpreting ? 'Interpreting...' : 'Interpret dream'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!dream.trim()}
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save to dream vault
                </button>
              </div>
            </form>

            <div className="grid gap-6 md:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Live reading</p>
                <h2 className="mt-3 font-display text-2xl text-white">
                  {liveTitle || 'Your reading will appear here'}
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {displayedInterpretation || 'Type a dream and this reading updates instantly.'}
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

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search saved dreams"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 transition hover:text-white"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {visibleVault.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-400">
                    No vault entries yet. Save your first dream to begin tracking patterns.
                  </p>
                ) : (
                  visibleVault.map((entry) => (
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
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {entry.interpretation.slice(0, 180)}{entry.interpretation.length > 180 ? '...' : ''}
                      </p>

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
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          <Star className="h-3.5 w-3.5" />
                          {entry.starred ? 'Unstar' : 'Star'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
                      <div className={`relative h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} shadow-inner`}>
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

      <footer className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-2 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 sm:px-6 lg:px-8">
        &copy; {new Date().getFullYear()} Dream Interpretation Dictionary • dreaminterpretation-dictionary.com
      </footer>
    </main>
  );
}
