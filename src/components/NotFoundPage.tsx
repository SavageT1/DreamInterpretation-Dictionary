export default function NotFoundPage() {
  return <main className="happy-site min-h-screen bg-celestial-gradient px-4 py-10 text-slate-100 sm:px-6">
    <div className="mx-auto max-w-3xl">
      <nav className="mb-10 flex flex-wrap gap-3 text-sm" aria-label="Primary navigation"><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/">Dream tool</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/blog">Blog</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/dream-terms">Dream terms</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/about">About</a><a className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10" href="/contact">Contact</a></nav>
      <article className="rounded-3xl border border-white/10 bg-slate-950/75 p-6 text-center shadow-2xl sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Dream Interpretation Dictionary</p>
        <h1 className="mt-4 font-display text-5xl font-bold text-white">Page not found</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-300">That address doesn't lead anywhere here. The page may have moved, or the link may have a typo.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a className="rounded-full bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300" href="/">Interpret a dream</a>
          <a className="rounded-full border border-white/15 px-6 py-3 hover:bg-white/10" href="/dream-symbols">Browse dream symbols</a>
        </div>
      </article>
      <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/editorial-policy">Editorial policy</a><a href="/contact">Contact</a><a href="https://www.youtube.com/@DreamInterpretationDictionary" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5" aria-label="Dream Interpretation Dictionary on YouTube"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg><span>YouTube</span></a></footer>
    </div>
  </main>;
}
