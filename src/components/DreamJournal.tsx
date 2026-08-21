import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import FEATURED_OFFER_IMAGE from '../../som-sleep-powder-drink-mix-all-flavors.jpeg';
import { trackEvent } from '../lib/analytics';
import { auth, db, googleProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

type VaultEntry = {
  id: string;
  title: string;
  dream: string;
  dreamBookNotes: string;
  interpretation: string;
  createdAt: string;
  starred: boolean;
};

type PlanId = 'weekly' | 'monthly' | 'annual';

const STORAGE_KEY = 'dream-interpretation-dictionary:vault:v1';
const FREE_ENTRY_LIMIT = 3;
const FREE_INTERPRETATION_LIMIT = 3;

const PLAN_DETAILS: Record<PlanId, { label: string; price: string; cadence: string; was?: string; save?: string }> = {
  weekly: { label: 'Weekly', price: '$3.99', cadence: '/ week' },
  monthly: { label: 'Monthly', price: '$8.99', cadence: '/ month', was: '$15.96', save: 'Save 44% vs. weekly billing' },
  annual: { label: 'Annual', price: '$49.99', cadence: '/ year', was: '$207.48', save: 'Save 76% vs. weekly · best value' },
};

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

// Minimal, dependency-free speech-to-text using the browser's native
// SpeechRecognition API. Degrades silently to "unsupported" on browsers
// that don't implement it (older Firefox, some in-app webviews).
function useSpeechToText(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      onTranscript(`${baseTextRef.current} ${finalTranscript}${interimTranscript}`.trim());
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start(currentText: string) {
    if (!recognitionRef.current) return;
    baseTextRef.current = currentText.trim();
    recognitionRef.current.start();
    setIsListening(true);
  }

  function stop() {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }

  function toggle(currentText: string) {
    if (isListening) {
      stop();
    } else {
      start(currentText);
    }
  }

  return { isListening, isSupported, toggle };
}

function DreamCalendar({ entries, onSelect }: { entries: VaultEntry[]; onSelect: (id: string) => void }) {
  const latest = entries[0]?.createdAt ? new Date(entries[0].createdAt) : new Date();
  const [month, setMonth] = useState(new Date(latest.getFullYear(), latest.getMonth(), 1));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const byDay = new Map<string, VaultEntry[]>();

  entries.forEach((entry) => {
    const key = new Date(entry.createdAt).toISOString().slice(0, 10);
    byDay.set(key, [...(byDay.get(key) || []), entry]);
  });

  return (
    <section className="dream-calendar" aria-label="Dream calendar">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          <p className="text-xs text-slate-600">Dream logo = entry saved</p>
        </div>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="calendar-nav">‹</button>
          <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="calendar-nav">›</button>
        </div>
      </div>
      <div className="calendar-grid mt-3">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`} className="calendar-weekday">{day}</span>)}
        {Array.from({ length: firstDay }).map((_, index) => <span key={`empty-${index}`} className="calendar-day calendar-empty" />)}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEntries = byDay.get(key) || [];
          return (
            <button key={key} type="button" className={`calendar-day ${dayEntries.length ? 'calendar-has-entry' : ''}`} onClick={() => dayEntries[0] && onSelect(dayEntries[0].id)} aria-label={dayEntries.length ? `${day} with dream entry` : `${day}`}>
              <span>{day}</span>
              {dayEntries.length ? <img src="/dream-brand-icon.png" alt="" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
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
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [member, setMember] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [hasShownPaywallThisReading, setHasShownPaywallThisReading] = useState(false);
  const interpretTimer = useRef<number | null>(null);
  const pendingDream = useRef('');
  const hasTrackedDreamStart = useRef(false);

  const speech = useSpeechToText((text) => setDream(text));

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  function toggleReadAloud() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !hasFreshReading) return;
    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(interpretation.replace(/[#*_>`]/g, ''));
    utterance.rate = 0.82;
    utterance.pitch = 0.92;
    utterance.volume = 0.88;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => /Samantha|Karen|Moira|Google UK English Female|Microsoft Zira/i.test(voice.name)) || voices.find((voice) => /female|natural|siri/i.test(voice.name)) || voices.find((voice) => voice.lang?.startsWith('en')) || null;
    utterance.onend = () => setIsReadingAloud(false);
    utterance.onerror = () => setIsReadingAloud(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsReadingAloud(true);
    trackEvent('dream_read_aloud_started');
  }

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

  useEffect(() => onAuthStateChanged(auth, (nextMember) => {
    setMember(nextMember);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    if (!authReady || !member) return;
    setIsCloudSyncing(true);
    const dreams = collection(db, 'users', member.uid, 'dreams');
    const unsubscribe = onSnapshot(
      dreams,
      (snapshot) => {
        const cloudVault = snapshot.docs.map((item) => item.data() as VaultEntry);
        setVault(cloudVault);
        setIsCloudSyncing(false);
        setAccountError('');
      },
      () => {
        setIsCloudSyncing(false);
        setAccountError('Cloud sync is not ready yet. Your local dreams remain on this device.');
      },
    );
    return unsubscribe;
  }, [authReady, member]);

  useEffect(() => {
    if (!authReady) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    accountHeaders().then((headers) => (
      params.get('checkout') === 'success' && sessionId
        ? fetch(`/api/verify-purchase?session_id=${encodeURIComponent(sessionId)}`, { headers })
        : fetch('/api/access', { headers })
    ))
      .then(async (response) => {
        const data = (await response.json()) as {
          premium?: boolean;
          paymentsEnabled?: boolean;
          freeRemaining?: number | null;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || 'Unable to verify access.');
        setIsPremium(Boolean(data.premium));
        setPaymentsEnabled(Boolean(data.paymentsEnabled) || Boolean(data.premium));
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
  }, [authReady, member]);

  useEffect(() => {
    if (member) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
    } catch {
      // Ignore storage failures so the app still works offline.
    }
  }, [member, vault]);

  async function accountHeaders() {
    if (!member) return {};
    return { Authorization: `Bearer ${await member.getIdToken()}` };
  }

  async function handleSignIn() {
    setIsSigningIn(true);
    setAccountError('');
    try {
      const localVault = [...vault];
      const result = await signInWithPopup(auth, googleProvider);
      await Promise.all(localVault.map((entry) =>
        setDoc(doc(db, 'users', result.user.uid, 'dreams', entry.id), entry, { merge: true }),
      ));
      trackEvent('member_signed_in');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setAccountError(
        message.includes('unauthorized-domain')
          ? 'Secure sign-in is being connected to this domain. Please try again shortly.'
          : message.includes('popup-closed') || message.includes('cancelled-popup')
            ? 'Sign-in was cancelled.'
            : 'Sign-in could not be completed. Please try again.',
      );
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    setVault([]);
    setIsPremium(false);
    trackEvent('member_signed_out');
  }

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

  // Lightweight, client-side pattern insight derived from saved vault
  // entries. For a more accurate version, this belongs server-side
  // alongside the interpretation model.
  const patternInsight = useMemo(() => {
    if (orderedVault.length < 2) return null;
    const KEYWORDS: Record<string, string[]> = {
      'Unfamiliar places': ['unfamiliar', 'strange place', "didn't recognize", 'new house', 'new city'],
      'Losing something': ['lost', 'losing', 'missing', 'misplaced', 'cannot find'],
      Flying: ['flying', 'floated', 'floating', 'soaring'],
      'Being chased': ['chased', 'chasing', 'running from', 'pursued'],
      Water: ['ocean', 'water', 'rain', 'flood', 'swimming', 'river'],
    };
    const counts: Record<string, number> = {};
    orderedVault.forEach((entry) => {
      const text = `${entry.dream} ${entry.interpretation}`.toLowerCase();
      Object.entries(KEYWORDS).forEach(([label, terms]) => {
        if (terms.some((term) => text.includes(term))) {
          counts[label] = (counts[label] || 0) + 1;
        }
      });
    });
    const ranked = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0) return null;
    return { ranked, totalDreams: orderedVault.length };
  }, [orderedVault]);

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

    if (!isPremium && freeInterpretationsLeft <= 0) {
      setShowPaywall(true);
      return;
    }

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
        headers: { 'Content-Type': 'application/json', ...(await accountHeaders()) },
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
        // Show the paywall once, right after the reading that uses up
        // the last free interpretation — the highest-intent moment.
        if (!result.premium && result.freeRemaining <= 0 && !hasShownPaywallThisReading) {
          setHasShownPaywallThisReading(true);
          window.setTimeout(() => setShowPaywall(true), 900);
        }
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

  async function handleSave() {
    const cleanDream = dream.trim();
    if (!cleanDream) return;

    const hasFreshReading = interpretedDream === cleanDream && interpretation.trim().length > 0;
    if (!hasFreshReading) return;
    if (!isPremium && vault.length >= FREE_ENTRY_LIMIT) {
      setShowPaywall(true);
      return;
    }
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
    if (member) {
      try {
        await setDoc(doc(db, 'users', member.uid, 'dreams', nextEntry.id), nextEntry);
      } catch {
        setInterpretationError('This dream could not be synced. Please try again.');
        return;
      }
    } else {
      setVault((current) => [nextEntry, ...current]);
    }
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

  async function toggleStar(id: string) {
    const entry = vault.find((item) => item.id === id);
    if (member && entry) {
      await updateDoc(doc(db, 'users', member.uid, 'dreams', id), { starred: !entry.starred });
      return;
    }
    setVault((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, starred: !entry.starred } : entry)),
    );
  }

  async function removeEntry(id: string) {
    if (member) {
      await deleteDoc(doc(db, 'users', member.uid, 'dreams', id));
    } else {
    setVault((current) => current.filter((entry) => entry.id !== id));
    }
    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  async function openBillingRoute(route: '/api/checkout' | '/api/portal', plan?: PlanId) {
    setIsStartingCheckout(true);
    setCheckoutPlan(plan ?? null);
    setInterpretationError('');

    try {
      const response = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await accountHeaders()) },
        // The backend defaults to "weekly" if no plan is sent, so this is
        // safe for the /api/portal call (which ignores the body).
        body: route === '/api/checkout' ? JSON.stringify({ plan: plan ?? 'weekly' }) : undefined,
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Secure billing could not be opened.');
      }
      if (route === '/api/checkout') {
        trackEvent('premium_checkout_started', { source: 'premium_card', plan: plan ?? 'weekly' });
      }
      window.location.assign(data.url);
    } catch (error) {
      setInterpretationError(
        error instanceof Error ? error.message : 'Secure billing could not be opened.',
      );
      setIsStartingCheckout(false);
      setCheckoutPlan(null);
    }
  }

  function closePaywall() {
    setShowPaywall(false);
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
          <a href="/" className="flex items-center gap-2.5 font-display text-sm font-bold uppercase tracking-[0.22em] text-slate-900">
            <img src="/dream-brand-icon.png" alt="" width="36" height="36" className="brand-logo h-9 w-9 rounded-xl" />
            <span>Dream Interpretation Dictionary</span>
          </a>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-700">
            <a href="#how-it-works">How it works</a>
            <a href="#premium">Premium</a>
            <a href="#dream-vault">Dream Vault</a>
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/contact">Contact</a>
          </div>
        </nav>

        <header className="max-w-4xl py-4">
          <h1 className="font-display uppercase text-slate-950">
            <span className="brand-gradient-text block text-7xl font-black leading-[0.82] tracking-[-0.07em] sm:text-8xl lg:text-[9rem]">Dream</span>
            <span className="mt-4 block text-2xl font-bold tracking-[0.16em] text-teal-700 sm:text-4xl">Interpretation</span>
            <span className="mt-2 block text-sm font-bold tracking-[0.5em] text-violet-700 sm:text-base">Dictionary</span>
          </h1>
          <p className="mt-7 max-w-3xl text-lg font-semibold leading-tight text-slate-800 sm:text-2xl">
            Understand the <span className="mx-1 inline-block text-3xl font-black uppercase text-violet-400 sm:text-5xl">meaning</span>
            <span> of what you&apos;re </span>
            <span className="mx-1 inline-block text-3xl font-black uppercase text-teal-300 sm:text-5xl">dreaming</span>.
          </p>
          <p className="mt-4 text-lg font-semibold text-slate-700">Track it in your personal Dream Vault.</p>
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
                <div className="relative">
                  <textarea
                    value={dream}
                    onChange={(event) => handleDreamChange(event.target.value)}
                    rows={8}
                    placeholder="I was walking through a house I didn't recognize, but it felt familiar..."
                    className="w-full rounded-3xl border border-white/40 bg-white px-4 py-4 pr-14 text-sm leading-6 text-slate-900 shadow-lg shadow-black/20 outline-none transition placeholder:text-slate-400 focus:border-fuchsia-400/60"
                  />
                  <button
                    type="button"
                    onClick={() => speech.toggle(dream)}
                    disabled={!speech.isSupported}
                    aria-label="Speak your dream"
                    title={speech.isSupported ? 'Speak your dream' : "Voice input isn't supported in this browser"}
                    className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-slate-950 shadow-md shadow-black/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30 ${
                      speech.isListening ? 'animate-pulse' : ''
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                </div>
                {speech.isListening ? (
                  <span className="flex items-center gap-2 text-xs text-fuchsia-200">
                    <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-300" />
                    Listening...
                  </span>
                ) : null}
                <span className="text-xs text-slate-500">Include what happened, who was there, and how it felt.</span>
                <span className="text-xs text-slate-500">
                  Your dream text is sent securely to OpenAI for interpretation. Readings are reflective, not medical advice or predictions.
                </span>
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isInterpreting || !hasDreamText}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isInterpreting ? 'Interpreting...' : hasDreamText ? 'Interpret dream' : 'Enter a dream first'}
                </button>
                <span className="text-xs text-slate-400">
                  {isPremium ? 'Premium: unlimited readings' : `${freeInterpretationsLeft} free interpretation${freeInterpretationsLeft === 1 ? '' : 's'} left`}
                </span>
              </div>

              <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="opacity-70">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Private by default — never sold or used to train AI models.{' '}
                <a href="/privacy" className="underline underline-offset-2">
                  Privacy policy
                </a>
              </p>
            </form>

            <div className="grid gap-6 md:grid-cols-2">
              <article className="ai-reading rounded-3xl border border-white/10 bg-white/5 p-5" aria-live="polite">
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

                {hasFreshReading ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-white/10 py-3">
                    <button type="button" onClick={toggleReadAloud} className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20">
                      <span aria-hidden="true">{isReadingAloud ? 'Ⅱ' : '▶'}</span>
                      {isReadingAloud ? 'Pause reading' : 'Read aloud'}
                    </button>
                    <span className="text-xs text-slate-500">A calm, slower voice for quiet reflection</span>
                  </div>
                ) : null}

                {interpretationError ? (
                  <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
                    {interpretationError}
                  </p>
                ) : null}

                {hasFreshReading ? (
                  <section className="mt-6 border-t border-white/10 pt-5" aria-label="Save this reading">
                    <button type="button" onClick={toggleReadAloud} className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20">
                      <span aria-hidden="true">{isReadingAloud ? 'Ⅱ' : '▶'}</span>
                      {isReadingAloud ? 'Pause reading' : 'Read aloud again'}
                    </button>
                    <p className="text-sm font-semibold text-white">Add it to your Dream Vault?</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      These details are optional and only help you find this dream later.
                    </p>

                    <div className="mt-4 grid gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-200">Dream title (optional)</span>
                        <input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          className="reader-field rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400/60 focus:bg-white/10"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-slate-200">Dream book notes (optional)</span>
                        <textarea
                          value={dreamBookNotes}
                          onChange={(event) => setDreamBookNotes(event.target.value)}
                          rows={3}
                          className="reader-field rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
                          placeholder="Add symbols, book references, or anything you want to remember."
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                      >
                        Add to Dream Vault
                      </button>
                    </div>
                  </section>
                ) : null}
              </article>

              <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-cyan-400/10 p-5">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Premium</p>
                <h2 className="mt-3 font-display text-2xl text-white">Unlimited interpretations</h2>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-200">
                  <li>- Start with {FREE_INTERPRETATION_LIMIT} personalized readings, free.</li>
                  <li>- From $3.99/week, or save with monthly or annual.</li>
                  <li>- Manage or cancel securely through Stripe.</li>
                </ul>
                <button
                  type="button"
                  onClick={() => openBillingRoute(isPremium ? '/api/portal' : '/api/checkout', 'weekly')}
                  disabled={isStartingCheckout || (!isPremium && !paymentsEnabled)}
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {isStartingCheckout && checkoutPlan === 'weekly'
                    ? 'Opening secure billing...'
                    : isPremium
                      ? 'Manage subscription'
                      : paymentsEnabled
                        ? 'Unlock unlimited readings'
                        : 'Premium launching shortly'}
                </button>
                <a href="#premium" className="mt-3 block text-center text-xs text-slate-300 underline underline-offset-2">
                  See all plans (weekly, monthly, annual)
                </a>
              </article>
            </div>
          </section>

          <aside className="space-y-6">
            <section id="dream-vault" className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Dream Vault</p>
                  <h2 className="mt-2 font-display text-2xl text-white">Your saved dreams</h2>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                  {member ? (isCloudSyncing ? 'Syncing...' : 'Cloud synced') : `${freeSlotsLeft} free saves remaining`}
                </div>
              </div>

              <DreamCalendar entries={orderedVault} onSelect={setSelectedId} />

              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-cyan-400/10 to-fuchsia-500/10 p-4">
                {member ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Your Vault is protected</p>
                      <p className="mt-1 break-all text-xs text-slate-300">Signed in as {member.email}</p>
                    </div>
                    <button type="button" onClick={handleSignOut} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-white">Keep your dreams on every device</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">Sign in before upgrading so your membership and private Dream Vault stay connected.</p>
                    <button type="button" onClick={handleSignIn} disabled={isSigningIn} className="mt-3 inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">
                      {isSigningIn ? 'Connecting...' : 'Continue with Google'}
                    </button>
                  </div>
                )}
                {accountError ? <p className="mt-3 text-xs leading-5 text-rose-200">{accountError}</p> : null}
              </div>

              <div className="mt-4 space-y-3">
                {orderedVault.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center">
                    <p className="text-sm text-slate-300">Your Dream Vault is empty.</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Interpret your first dream above and save it here. Patterns start to appear once you've saved a few.
                    </p>
                  </div>
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

              {patternInsight ? (
                <div className="mt-5 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">What's been showing up</h3>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      {patternInsight.totalDreams} dreams
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {patternInsight.ranked.slice(0, 4).map(([label, count]) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-[10px] font-bold text-slate-950">
                          {count}
                        </span>
                        {label}
                      </span>
                    ))}
                  </div>
                  {!isPremium ? (
                    <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="4" y="10" width="16" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                      Full symbol history and trend charts unlock with premium
                    </p>
                  ) : null}
                </div>
              ) : null}
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
                    className="group mx-auto block w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/20"
                  >
                    <div className="relative isolate overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-90`} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_35%)]" />
                      <div className="relative space-y-3 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/90">
                            Sponsored
                          </span>
                          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90">
                            {item.meta ?? item.label}
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[112px_1fr]">
                          <div className="relative h-24 overflow-hidden rounded-2xl border border-white/15 bg-black/20 shadow-[0_20px_40px_rgba(0,0,0,0.28)] sm:h-28">
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
                            <h3 className="mt-2 font-display text-xl text-white sm:text-2xl">{item.title}</h3>
                            <p className="mt-2 text-sm leading-5 text-white/85">
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
          <article className="rounded-3xl border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Step one</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-slate-950">Describe it</h2>
            <p className="mt-3 leading-7 text-slate-700">Write what happened, who was there, how it felt — or just speak it with the mic button. One field, nothing else competing for attention.</p>
          </article>
          <article className="rounded-3xl border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Step two</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-slate-950">See your Dream Meaning</h2>
            <p className="mt-3 leading-7 text-slate-700">Your reading connects common symbolic themes with the emotional tone of your dream. It offers possibilities for reflection—not predictions or diagnoses.</p>
          </article>
          <article className="rounded-3xl border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700">Step three</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-slate-950">Add it to your Dream Vault</h2>
            <p className="mt-3 leading-7 text-slate-700">Every saved dream builds your personal archive — and over time, your Dream Vault surfaces the symbols and themes that keep coming back.</p>
          </article>
        </section>

        <section id="premium" className="rounded-[2rem] border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-700">Premium</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold text-slate-950">Keep your dream practice going with unlimited access</h2>
          <p className="mt-3 max-w-2xl text-slate-700">Your first readings are free. Premium unlocks unlimited interpretations, unlimited Vault saves, calendar history, and recurring pattern insights for less than a coffee a week.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(Object.keys(PLAN_DETAILS) as PlanId[]).map((planId) => {
              const plan = PLAN_DETAILS[planId];
              const isMonthly = planId === 'monthly';
              return (
                <div
                  key={planId}
                  className={`relative rounded-3xl border p-6 ${
                    isMonthly
                      ? 'border-fuchsia-400/60 bg-gradient-to-br from-fuchsia-500/10 to-cyan-400/10'
                      : 'border-slate-900/10 bg-white'
                  }`}
                >
                  {isMonthly ? (
                    <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-950">
                      Most popular
                    </span>
                  ) : null}
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{plan.label}</p>
                  {plan.was ? <p className="mt-3 text-sm text-slate-400 line-through">{plan.was}</p> : null}
                  <p className={`font-display text-3xl font-bold text-slate-950 ${plan.was ? '' : 'mt-3'}`}>
                    {plan.price} <span className="text-sm font-normal text-slate-500">{plan.cadence}</span>
                  </p>
                  {plan.save ? <p className="mt-1 text-xs font-semibold text-teal-600">{plan.save}</p> : null}
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    <li>Unlimited AI interpretations</li>
                    <li>Unlimited Vault saves + calendar history</li>
                    <li>Recurring pattern insights</li>
                    <li>Manage or cancel anytime via Stripe</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => openBillingRoute(isPremium ? '/api/portal' : '/api/checkout', planId)}
                    disabled={isStartingCheckout || (!isPremium && !paymentsEnabled)}
                    className={`mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                      isMonthly
                        ? 'bg-slate-950 text-white hover:scale-[1.01]'
                        : 'border border-slate-900/15 text-slate-900 hover:bg-slate-900/5'
                    }`}
                  >
                    {isStartingCheckout && checkoutPlan === planId
                      ? 'Opening secure billing...'
                      : isPremium
                        ? 'Manage subscription'
                        : `Start ${plan.label.toLowerCase()}`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/50 bg-white/75 p-6 shadow-xl shadow-indigo-950/10 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-700">A better way to use a dream dictionary</p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold text-slate-950">Symbols are starting points, not fixed answers.</h2>
          <div className="mt-5 grid gap-5 text-base leading-7 text-slate-700 md:grid-cols-2"><p>Water might feel peaceful to one person and threatening to another. A house could represent safety, identity, family history, or simply a recent memory. A useful interpretation considers what happened, how you felt, and what the symbol means in your own life.</p><p>Reviewing dreams over time can reveal repeated places, emotions, and choices. Your Dream Vault helps you compare those patterns without claiming that dreams predict the future. Treat every reading as an invitation to reflect and keep what genuinely fits.</p></div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-slate-900/10 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 Dream Interpretation Dictionary. For reflection and entertainment—not professional advice.</p><nav className="flex flex-wrap gap-4" aria-label="Footer navigation"><a href="/about">About</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/editorial-policy">Editorial policy</a><a href="/contact">Contact</a></nav></footer>
      </section>

      {showPaywall ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-5 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closePaywall();
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-8">
            <button
              type="button"
              onClick={closePaywall}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20"
            >
              ✕
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Your free reads are used up</p>
            <h3 className="mt-3 font-display text-xl font-bold leading-snug text-white">
              Keep exploring what your dreams are telling you
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              You've used all {FREE_INTERPRETATION_LIMIT} free interpretations. Subscribe to keep interpreting — unlimited
              readings, unlimited saves, and full pattern insights in your Dream Vault.
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-orange-400/25 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Introductory pricing — locked in for as long as you stay subscribed
            </div>

            <div className="mt-5 rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/15 to-cyan-400/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Unlimited interpretations — $3.99/week</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">No more counting your reads. Cancel anytime.</p>
            </div>

            <button
              type="button"
              onClick={() => openBillingRoute('/api/checkout', 'weekly')}
              disabled={isStartingCheckout}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:scale-[1.01] disabled:opacity-60"
            >
              {isStartingCheckout && checkoutPlan === 'weekly' ? 'Opening secure billing...' : 'Get unlimited access'}
            </button>
            <a
              href="#premium"
              onClick={closePaywall}
              className="mt-3 block text-center text-xs text-slate-400 underline underline-offset-2"
            >
              Or see monthly &amp; annual plans
            </a>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <span className="text-amber-400">★★★★★</span> Loved by thousands interpreting their dreams daily
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
