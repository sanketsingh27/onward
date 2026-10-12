import type { ReactNode } from 'react'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6">
      <div aria-hidden className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl" />
      <div aria-hidden className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-sky-400/25 blur-3xl" />
      <div className="relative w-full max-w-md">{children}</div>
    </main>
  )
}
