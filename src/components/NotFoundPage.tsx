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
      <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/editorial-policy">Editorial policy</a><a href="/contact">Contact</a></footer>
    </div>
  </main>;
}
