type EducationPageProps = { kind: 'blog' | 'dictionary' };

const articles = [
  { title: 'How to remember more of your dreams', description: 'Simple bedside habits that help you capture details before they fade.' },
  { title: 'Why emotions matter in dream interpretation', description: 'Use the feeling of a dream as context instead of treating symbols as fixed predictions.' },
  { title: 'How recurring dreams can support reflection', description: 'Compare repeated settings, people, and choices in your private Dream Vault.' },
];

const terms = [
  { title: 'Water in dreams', description: 'Water may reflect emotion, change, uncertainty, calm, or recent experiences depending on your personal context.' },
  { title: 'Flying in dreams', description: 'Flying may connect with freedom, ambition, control, escape, or a change in perspective.' },
  { title: 'Being chased in dreams', description: 'A chase can reflect avoidance, pressure, unresolved conflict, or an ordinary memory of stress.' },
  { title: 'Houses in dreams', description: 'A house may relate to identity, safety, family history, privacy, or the different parts of your life.' },
];

export default function EducationPage({ kind }: EducationPageProps) {
  const isBlog = kind === 'blog';
  const items = isBlog ? articles : terms;
  return <main className="happy-site min-h-screen bg-celestial-gradient px-4 py-10 text-slate-100 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <nav className="mb-10 flex flex-wrap gap-3 text-sm" aria-label="Primary navigation"><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/">Dream tool</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/blog">Blog</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/dream-terms">Dream terms</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/about">About</a></nav>
      <header className="rounded-[2rem] border border-white/15 bg-slate-950/75 p-6 shadow-2xl sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-fuchsia-300">{isBlog ? 'Dream education' : 'Dream symbol guide'}</p>
        <h1 className="mt-4 font-display text-4xl font-bold text-white sm:text-6xl">{isBlog ? 'Ideas for better dream reflection' : 'Explore common dream themes'}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{isBlog ? 'Practical guidance for remembering, exploring, and journaling dreams.' : 'Common associations are starting points. Your emotions, memories, and life context matter most.'}</p>
      </header>
      <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label={isBlog ? 'Dream articles' : 'Dream terms'}>{items.map((item) => <article key={item.title} className="rounded-3xl border border-white/15 bg-slate-950/75 p-6 shadow-xl"><h2 className="font-display text-2xl font-bold text-white">{item.title}</h2><p className="mt-3 leading-7 text-slate-300">{item.description}</p><a className="mt-5 inline-flex font-bold text-cyan-300" href="/">Interpret your own dream →</a></article>)}</section>
      <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-8 text-sm text-slate-400"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/editorial-policy">Editorial policy</a><a href="/contact">Contact</a></footer>
    </div>
  </main>;
}
